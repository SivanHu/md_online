import simpleGit from 'simple-git';
import config from '../config.js';

function gitClient() {
  return simpleGit({ baseDir: config.gitRepoPath });
}

function todayBounds(dateStr) {
  const base = dateStr || new Date().toISOString().slice(0, 10);
  const start = `${base}T00:00:00`;
  const end = `${base}T23:59:59`;
  return { date: base, start, end };
}

function parseNumstat(text) {
  const files = [];
  let insertions = 0;
  let deletions = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [insRaw, delRaw, filePath] = parts;
    const ins = insRaw === '-' ? 0 : Number(insRaw) || 0;
    const del = delRaw === '-' ? 0 : Number(delRaw) || 0;
    insertions += ins;
    deletions += del;
    files.push({
      path: filePath,
      insertions: ins,
      deletions: del,
      binary: insRaw === '-' && delRaw === '-',
    });
  }
  return { files, insertions, deletions };
}

function parseNameStatus(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [status, ...rest] = line.split('\t');
    const filePath = rest[rest.length - 1];
    if (!filePath) continue;
    map.set(filePath, status);
  }
  return map;
}

async function isGitRepo() {
  try {
    const git = gitClient();
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

export async function getStatus() {
  if (!(await isGitRepo())) {
    return {
      isRepo: false,
      branch: null,
      files: [],
      summary: { conflicted: 0, created: 0, deleted: 0, modified: 0, renamed: 0, staged: 0, not_added: 0 },
    };
  }
  const git = gitClient();
  const status = await git.status();
  return {
    isRepo: true,
    branch: status.current,
    tracking: status.tracking,
    ahead: status.ahead,
    behind: status.behind,
    files: status.files.map((f) => ({
      path: f.path,
      index: f.index,
      working_dir: f.working_dir,
    })),
    summary: {
      conflicted: status.conflicted.length,
      created: status.created.length,
      deleted: status.deleted.length,
      modified: status.modified.length,
      renamed: status.renamed.length,
      staged: status.staged.length,
      not_added: status.not_added.length,
    },
  };
}

export async function getCommits({ since, until, maxCount = 50, paths = [] } = {}) {
  if (!(await isGitRepo())) return [];
  const git = gitClient();
  const options = {
    maxCount,
    format: {
      hash: '%H',
      shortHash: '%h',
      date: '%cI',
      message: '%s',
      body: '%b',
      authorName: '%an',
      authorEmail: '%ae',
    },
  };
  if (since) options['--since'] = since;
  if (until) options['--until'] = until;

  const log = await git.log(options);
  let commits = log.all.map((c) => ({
    hash: c.hash,
    shortHash: c.hash.slice(0, 7),
    date: c.date,
    message: c.message,
    body: c.body,
    authorName: c.author_name,
    authorEmail: c.author_email,
  }));

  if (paths?.length) {
    // simple-git log path filter via raw if needed; keep all for simplicity when mixed
  }

  return commits;
}

export async function getDiffSummary({
  since,
  until,
  baseRef,
  headRef = 'HEAD',
  paths = [],
  includeWorkingTree = true,
  maxDiffChars = config.summary.maxDiffChars,
} = {}) {
  if (!(await isGitRepo())) {
    return {
      isRepo: false,
      commits: [],
      files: [],
      stats: { filesChanged: 0, insertions: 0, deletions: 0, commits: 0 },
      patch: '',
      truncated: false,
    };
  }

  const git = gitClient();
  const rangeArgs = [];
  let commits = [];

  if (baseRef) {
    const range = `${baseRef}...${headRef}`;
    rangeArgs.push(range);
    try {
      commits = await getCommits({ maxCount: 100 });
      const log = await git.log({ from: baseRef, to: headRef, maxCount: 100 });
      commits = log.all.map((c) => ({
        hash: c.hash,
        shortHash: c.hash.slice(0, 7),
        date: c.date,
        message: c.message,
        authorName: c.author_name,
      }));
    } catch {
      commits = [];
    }
  } else if (since || until) {
    commits = await getCommits({ since, until, maxCount: 100, paths });
  } else {
    const bounds = todayBounds();
    commits = await getCommits({ since: bounds.start, until: bounds.end, maxCount: 100 });
  }

  // Collect file stats from commits range or working tree
  let numstatText = '';
  let nameStatusText = '';
  let patch = '';

  try {
    if (baseRef) {
      numstatText = await git.raw(['diff', '--numstat', `${baseRef}...${headRef}`, '--', ...paths]);
      nameStatusText = await git.raw(['diff', '--name-status', `${baseRef}...${headRef}`, '--', ...paths]);
      patch = await git.raw(['diff', `${baseRef}...${headRef}`, '--', ...paths]);
    } else if (commits.length > 0) {
      const first = commits[commits.length - 1].hash;
      const last = commits[0].hash;
      // parent of first commit to last
      try {
        numstatText = await git.raw(['diff', '--numstat', `${first}^...${last}`, '--', ...paths]);
        nameStatusText = await git.raw(['diff', '--name-status', `${first}^...${last}`, '--', ...paths]);
        patch = await git.raw(['diff', `${first}^...${last}`, '--', ...paths]);
      } catch {
        numstatText = await git.raw(['show', '--numstat', '--format=', last, '--', ...paths]);
        nameStatusText = await git.raw(['show', '--name-status', '--format=', last, '--', ...paths]);
        patch = await git.raw(['show', '--format=', last, '--', ...paths]);
      }
    }

    if (includeWorkingTree) {
      const wtNum = await git.raw(['diff', '--numstat', 'HEAD', '--', ...paths]);
      const wtName = await git.raw(['diff', '--name-status', 'HEAD', '--', ...paths]);
      const wtPatch = await git.raw(['diff', 'HEAD', '--', ...paths]);
      const stagedNum = await git.raw(['diff', '--cached', '--numstat', '--', ...paths]);
      const stagedName = await git.raw(['diff', '--cached', '--name-status', '--', ...paths]);
      const stagedPatch = await git.raw(['diff', '--cached', '--', ...paths]);
      numstatText = [numstatText, wtNum, stagedNum].filter(Boolean).join('\n');
      nameStatusText = [nameStatusText, wtName, stagedName].filter(Boolean).join('\n');
      patch = [patch, wtPatch, stagedPatch].filter(Boolean).join('\n');
    }
  } catch (err) {
    // empty repo or no HEAD
    console.warn('diff summary warning:', err.message);
  }

  const { files: fileStats, insertions, deletions } = parseNumstat(numstatText);
  const statusMap = parseNameStatus(nameStatusText);

  // merge duplicates by path
  const merged = new Map();
  for (const f of fileStats) {
    const prev = merged.get(f.path) || { path: f.path, insertions: 0, deletions: 0, binary: false, status: 'M' };
    prev.insertions += f.insertions;
    prev.deletions += f.deletions;
    prev.binary = prev.binary || f.binary;
    prev.status = statusMap.get(f.path) || prev.status;
    merged.set(f.path, prev);
  }

  // also include untracked from status when including working tree
  if (includeWorkingTree) {
    try {
      const status = await git.status();
      for (const p of status.not_added || []) {
        if (paths.length && !paths.some((prefix) => p.startsWith(prefix))) continue;
        if (!merged.has(p)) {
          merged.set(p, { path: p, insertions: 0, deletions: 0, binary: false, status: 'A' });
        }
      }
    } catch {
      // ignore
    }
  }

  const files = [...merged.values()].sort((a, b) => a.path.localeCompare(b.path));
  let truncated = false;
  if (patch.length > maxDiffChars) {
    patch = patch.slice(0, maxDiffChars);
    truncated = true;
  }

  return {
    isRepo: true,
    commits,
    files,
    stats: {
      filesChanged: files.length,
      insertions,
      deletions,
      commits: commits.length,
    },
    patch,
    truncated,
  };
}

export async function getTodayChanges(dateStr) {
  const { date, start, end } = todayBounds(dateStr);
  const summary = await getDiffSummary({
    since: start,
    until: end,
    includeWorkingTree: true,
  });
  return { date, ...summary };
}

export { todayBounds };
