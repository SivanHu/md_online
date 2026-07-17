import path from 'node:path';
import config from '../config.js';

/**
 * Resolve a user-provided relative path under docsRoot.
 * Prevents path traversal outside the docs directory.
 */
export function resolveDocsPath(relativePath = '') {
  const normalized = String(relativePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (normalized.includes('\0')) {
    throw Object.assign(new Error('Invalid path'), { status: 400 });
  }

  const abs = path.resolve(config.docsRoot, normalized);
  const root = path.resolve(config.docsRoot);
  const rel = path.relative(root, abs);

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw Object.assign(new Error('Path escapes docs root'), { status: 403 });
  }

  return { abs, rel: rel.replace(/\\/g, '/'), root };
}

export function ensureWriteAllowed() {
  if (!config.allowWrite) {
    throw Object.assign(new Error('Write operations are disabled'), { status: 403 });
  }
}
