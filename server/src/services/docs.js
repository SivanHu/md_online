import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import config from '../config.js';
import { resolveDocsPath, ensureWriteAllowed } from '../utils/path.js';

const MD_EXT = new Set(['.md', '.markdown', '.mdx']);

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function isMarkdown(filePath) {
  return MD_EXT.has(path.extname(filePath).toLowerCase());
}

async function walkDir(absDir, relDir = '') {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(absDir, entry.name);
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = await walkDir(abs, rel);
      if (children.length > 0) {
        nodes.push({
          type: 'dir',
          name: entry.name,
          path: rel.replace(/\\/g, '/'),
          children,
        });
      }
    } else if (entry.isFile() && isMarkdown(entry.name)) {
      nodes.push({
        type: 'file',
        name: entry.name,
        path: rel.replace(/\\/g, '/'),
      });
    }
  }

  return nodes;
}

export async function getDocTree() {
  if (!(await pathExists(config.docsRoot))) {
    await fs.mkdir(config.docsRoot, { recursive: true });
  }
  const children = await walkDir(config.docsRoot);
  return {
    root: path.relative(config.projectRoot, config.docsRoot).replace(/\\/g, '/') || 'docs',
    children,
  };
}

export async function docExists(relativePath) {
  try {
    const { abs } = resolveDocsPath(relativePath);
    if (!(await pathExists(abs))) return false;
    const stat = await fs.stat(abs);
    return stat.isFile() && isMarkdown(abs);
  } catch {
    return false;
  }
}

export async function getDocContent(relativePath) {
  const { abs, rel } = resolveDocsPath(relativePath);
  if (!(await pathExists(abs))) {
    throw Object.assign(new Error('Document not found'), { status: 404 });
  }
  const stat = await fs.stat(abs);
  if (!stat.isFile() || !isMarkdown(abs)) {
    throw Object.assign(new Error('Not a markdown file'), { status: 400 });
  }

  const raw = await fs.readFile(abs, 'utf8');
  const parsed = matter(raw);
  return {
    path: rel,
    content: parsed.content,
    raw,
    frontmatter: parsed.data || {},
    stats: {
      size: stat.size,
      mtime: stat.mtime.toISOString(),
    },
  };
}

export async function saveDocContent(relativePath, content, { createDirs = true } = {}) {
  ensureWriteAllowed();
  const { abs, rel } = resolveDocsPath(relativePath);
  if (!isMarkdown(abs)) {
    throw Object.assign(new Error('Only markdown files can be written'), { status: 400 });
  }
  if (createDirs) {
    await fs.mkdir(path.dirname(abs), { recursive: true });
  }
  await fs.writeFile(abs, content, 'utf8');
  return { path: rel, bytes: Buffer.byteLength(content, 'utf8') };
}

function scoreMatch(query, title, rel, content) {
  const q = query.toLowerCase();
  const titleL = title.toLowerCase();
  const relL = rel.toLowerCase();
  const contentL = content.toLowerCase();
  let score = 0;

  if (titleL === q) score += 100;
  else if (titleL.includes(q)) score += 50;
  if (relL.includes(q)) score += 20;
  if (path.basename(relL).includes(q)) score += 25;

  // term frequency in content (capped)
  let idx = 0;
  let hits = 0;
  while (hits < 20) {
    const found = contentL.indexOf(q, idx);
    if (found === -1) break;
    hits += 1;
    idx = found + q.length;
  }
  score += hits * 2;

  return score;
}

function makeSnippet(content, query, maxLen = 180) {
  const lines = content.split(/\r?\n/);
  const q = query.toLowerCase();
  for (const line of lines) {
    if (line.toLowerCase().includes(q)) {
      const trimmed = line.trim();
      const pos = trimmed.toLowerCase().indexOf(q);
      if (pos > 40) {
        return `…${trimmed.slice(pos - 30, pos + maxLen - 30)}`;
      }
      return trimmed.slice(0, maxLen);
    }
  }
  return lines.find((l) => l.trim())?.trim().slice(0, maxLen) || '';
}

export async function searchDocs(query, { limit = 50 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  const results = [];

  async function walk(absDir, relDir = '') {
    let entries;
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const abs = path.join(absDir, entry.name);
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(abs, rel);
      } else if (entry.isFile() && isMarkdown(entry.name)) {
        try {
          const raw = await fs.readFile(abs, 'utf8');
          const parsed = matter(raw);
          const title =
            parsed.data?.title ||
            entry.name.replace(/\.mdx?$/i, '').replace(/\.markdown$/i, '');
          const hay = `${title}\n${rel}\n${parsed.content}`.toLowerCase();
          if (!hay.includes(q)) continue;

          const score = scoreMatch(q, title, rel, parsed.content);
          results.push({
            path: rel.replace(/\\/g, '/'),
            title,
            snippet: makeSnippet(parsed.content, q),
            tags: parsed.data?.tags || [],
            score,
          });
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  await walk(config.docsRoot);
  return results
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit)
    .map(({ score, ...rest }) => rest);
}

export async function listRecentDocs({ limit = 10 } = {}) {
  const files = [];

  async function walk(absDir, relDir = '') {
    let entries;
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const abs = path.join(absDir, entry.name);
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(abs, rel);
      } else if (entry.isFile() && isMarkdown(entry.name)) {
        const stat = await fs.stat(abs);
        let title = entry.name;
        try {
          const raw = await fs.readFile(abs, 'utf8');
          const parsed = matter(raw);
          title = parsed.data?.title || entry.name.replace(/\.mdx?$/i, '');
        } catch {
          // ignore
        }
        files.push({
          path: rel.replace(/\\/g, '/'),
          title,
          mtime: stat.mtime.toISOString(),
        });
      }
    }
  }

  await walk(config.docsRoot);
  return files
    .sort((a, b) => new Date(b.mtime) - new Date(a.mtime))
    .slice(0, limit);
}
