import simpleGit from 'simple-git';
import config from '../config.js';
import { localDayBounds } from '../utils/date.js';

function gitClient() {
  return simpleGit({ baseDir: config.gitRepoPath });
}

function parseNumstat(text) {
  const files = [];
  let insertions = 0;
  let deletions = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [insRaw, delRaw, ...pathParts] = parts;
    const filePath = pathParts.join('\t');
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
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const status = parts[0];
    // rename/copy: STATUS\told\tnew — use last path component
    const filePath = parts[parts.length - 1];
    if (!filePath || !status) continue;
    map.set(filePath, status);
  }
  return map;
}

function matchesPathFilters(filePath, paths = []) {
  if (!paths?.length) return true;
  const normalized = filePath.replace(/\\/g, '/');
  return paths.some((prefix) => {
    const p = String(prefix).replace(/\\/g, '/').replace(/\/+$/, '');
    return normalized === p || normalized.startsWith(`${p}/`) || normalized.startsWith(p);
  });
}

function pathArgs(paths = []) {
  return paths?.length ? ['--', ...paths] : [];
}

async function isGitRepo() {
  try {
    const git = gitClient();
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

function mapCommit(c) {
  return {
    hash: c.hash,
    shortHash: c.hash?.slice(0, 7) || c.hash,
    date: c.date,
    message: c.message,
    body: c.body,
    authorName: c.author_name,
    authorEmail: c.author_email,
  };
}

export async function getStatus() {
  if (!(await isGitRepo())) {
    return {
      isRepo: false,
      branch: null,
      files: [],
      summary: {
        conflicted: 0,
        created: 0,
        deleted: 0,
        modified: 0,
        renamed: 0,
        staged: 0,
        not_added: 0,
      },
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

  // Prefer raw log so path filters work reliably with simple-git.
  const args = [
    'log',
    `--max-count=${maxCount}`,
    '--pretty=format:%H%x09%cI%x09%an%x09%ae%x09%s%x09%b%x1e',
  ];
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);
  args.push(...pathArgs(paths));

  try {
    const raw = await git.raw(args);
    if (!raw?.trim()) return [];
    return raw
      .split('\x1e')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const [hash, date, authorName, authorEmail, message, ...bodyParts] = chunk.split('\t');
        return {
          hash,
          shortHash: hash?.slice(0, 7),
          date,
          message: message || '',
          body: bodyParts.join('\t') || '',
          authorName,
          authorEmail,
        };
      });
  } catch {
    // Fallback without path filter
    try {
      const options = {
        maxCount,
        format: {
          hash: '%H',
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
      let commits = log.all.map(mapCommit);
      if (paths?.length) {
        commits = commits; // path filter only via raw above
      }
      return commits;
    } catch {
      return [];
    }
  }
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
  let commits = [];

  if (baseRef) {
    try {
      const log = await git.log({ from: baseRef, to: headRef, maxCount: 100, file: paths.length === 1 ? paths[0] : undefined });
      commits = log.all.map(mapCommit);
      // When multiple path filters, re-filter via raw log range
      if (paths.length > 1) {
        const raw = await git.raw([
          'log',
          `${baseRef}...${headRef}`,
          '--max-count=100',
          '--pretty=format:%H%x09%cI%x09%an%x09%ae%x09%s%x1e',
          ...pathArgs(paths),
        ]);
        commits = raw
          .split('\x1e')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((chunk) => {
            const [hash, date, authorName, authorEmail, message] = chunk.split('\t');
            return {
              hash,
              shortHash: hash?.slice(0, 7),
              date,
              message: message || '',
              authorName,
              authorEmail,
            };
          });
      } else if (paths.length === 1) {
        // already filtered by file option when single path
      } else {
        // no path filter — log already ok
      }
    } catch {
      try {
        const raw = await git.raw([
          'log',
          `${baseRef}...${headRef}`,
          '--max-count=100',
          '--pretty=format:%H%x09%cI%x09%an%x09%ae%x09%s%x1e',
          ...pathArgs(paths),
        ]);
        commits = raw
          .split('\x1e')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((chunk) => {
            const [hash, date, authorName, authorEmail, message] = chunk.split('\t');
            return {
              hash,
              shortHash: hash?.slice(0, 7),
              date,
              message: message || '',
              authorName,
              authorEmail,
            };
          });
      } catch {
        commits = [];
      }
    }
  } else if (since || until) {
    commits = await getCommits({ since, until, maxCount: 100, paths });
  } else {
    const bounds = localDayBounds();
    commits = await getCommits({ since: bounds.start, until: bounds.end, maxCount: 100, paths });
  }

  let numstatText = '';
  let nameStatusText = '';
  let patch = '';
  const pa = pathArgs(paths);

  try {
    if (baseRef) {
      numstatText = await git.raw(['diff', '--numstat', `${baseRef}...${headRef}`, ...pa]);
      nameStatusText = await git.raw(['diff', '--name-status', `${baseRef}...${headRef}`, ...pa]);
      patch = await git.raw(['diff', `${baseRef}...${headRef}`, ...pa]);
    } else if (commits.length > 0) {
      const first = commits[commits.length - 1].hash;
      const last = commits[0].hash;
      try {
        numstatText = await git.raw(['diff', '--numstat', `${first}^...${last}`, ...pa]);
        nameStatusText = await git.raw(['diff', '--name-status', `${first}^...${last}`, ...pa]);
        patch = await git.raw(['diff', `${first}^...${last}`, ...pa]);
      } catch {
        numstatText = await git.raw(['show', '--numstat', '--format=', last, ...pa]);
        nameStatusText = await git.raw(['show', '--name-status', '--format=', last, ...pa]);
        patch = await git.raw(['show', '--format=', last, ...pa]);
      }
    }

    if (includeWorkingTree) {
      const wtNum = await git.raw(['diff', '--numstat', 'HEAD', ...pa]);
      const wtName = await git.raw(['diff', '--name-status', 'HEAD', ...pa]);
      const wtPatch = await git.raw(['diff', 'HEAD', ...pa]);
      const stagedNum = await git.raw(['diff', '--cached', '--numstat', ...pa]);
      const stagedName = await git.raw(['diff', '--cached', '--name-status', ...pa]);
      const stagedPatch = await git.raw(['diff', '--cached', ...pa]);
      numstatText = [numstatText, wtNum, stagedNum].filter(Boolean).join('\n');
      nameStatusText = [nameStatusText, wtName, stagedName].filter(Boolean).join('\n');
      patch = [patch, wtPatch, stagedPatch].filter(Boolean).join('\n');
    }
  } catch (err) {
    console.warn('diff summary warning:', err.message);
  }

  const { files: fileStats, insertions, deletions } = parseNumstat(numstatText);
  const statusMap = parseNameStatus(nameStatusText);

  const merged = new Map();
  for (const f of fileStats) {
    if (!matchesPathFilters(f.path, paths)) continue;
    const prev = merged.get(f.path) || {
      path: f.path,
      insertions: 0,
      deletions: 0,
      binary: false,
      status: 'M',
    };
    prev.insertions += f.insertions;
    prev.deletions += f.deletions;
    prev.binary = prev.binary || f.binary;
    prev.status = statusMap.get(f.path) || prev.status;
    merged.set(f.path, prev);
  }

  if (includeWorkingTree) {
    try {
      const status = await git.status();
      for (const p of status.not_added || []) {
        if (!matchesPathFilters(p, paths)) continue;
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
  let outPatch = patch;
  if (outPatch.length > maxDiffChars) {
    outPatch = outPatch.slice(0, maxDiffChars);
    truncated = true;
  }

  // Recompute totals from merged files for consistency after path filter
  const totalIns = files.reduce((s, f) => s + f.insertions, 0);
  const totalDel = files.reduce((s, f) => s + f.deletions, 0);

  return {
    isRepo: true,
    commits,
    files,
    stats: {
      filesChanged: files.length,
      insertions: totalIns,
      deletions: totalDel,
      commits: commits.length,
    },
    patch: outPatch,
    truncated,
  };
}

export async function getTodayChanges(dateStr, options = {}) {
  const { date, start, end } = localDayBounds(dateStr);
  const summary = await getDiffSummary({
    since: start,
    until: end,
    includeWorkingTree: options.includeWorkingTree !== false,
    paths: options.paths || [],
    baseRef: options.baseRef,
    headRef: options.headRef || 'HEAD',
    maxDiffChars: options.maxDiffChars,
  });
  return { date, ...summary };
}

export { localDayBounds as todayBounds, parseNumstat, parseNameStatus, matchesPathFilters };
