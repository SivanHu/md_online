import crypto from 'node:crypto';

export function projectIdentity(value, fallback = 'project') {
  const name = String(value || fallback).trim() || fallback;
  if (/[\r\n]/.test(name) || name.length > 100) {
    throw Object.assign(new Error('Invalid project name'), { status: 400 });
  }

  const normalized = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const id = normalized || `project-${crypto.createHash('sha256').update(name).digest('hex').slice(0, 10)}`;
  return { name, id };
}
