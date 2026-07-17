#!/usr/bin/env node

import fs from 'node:fs/promises';
import crypto from 'node:crypto';

function usage(message) {
  if (message) console.error(`Error: ${message}`);
  console.error('Usage: node sync-daily-summary.mjs --input <entry.md> [--entry-id <id>] [--date YYYY-MM-DD] [--dry-run]');
  process.exit(2);
}

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (!['--input', '--entry-id', '--date'].includes(arg)) usage(`unknown argument: ${arg}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) usage(`missing value for ${arg}`);
    args[arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  if (!args.input) usage('--input is required');
  return args;
}

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultDocument(date) {
  return `---\ntitle: 每日开发总结 · ${date}\ndate: ${date}\ntags: [daily, summary]\ngenerated_by: codex\n---\n\n# 每日开发总结 · ${date}\n`;
}

function mergeEntry(document, entry, entryId) {
  const start = `<!-- sivan-note-entry:${entryId}:start -->`;
  const end = `<!-- sivan-note-entry:${entryId}:end -->`;
  const block = `${start}\n${entry.trim()}\n${end}`;
  const startIndex = document.indexOf(start);

  if (startIndex === -1) return `${document.trimEnd()}\n\n${block}\n`;

  const endIndex = document.indexOf(end, startIndex + start.length);
  if (endIndex === -1) throw new Error(`found start marker without end marker for entry ${entryId}`);
  return `${document.slice(0, startIndex)}${block}${document.slice(endIndex + end.length)}`;
}

async function responseBody(response) {
  const type = response.headers.get('content-type') || '';
  return type.includes('application/json') ? response.json() : response.text();
}

const args = parseArgs(process.argv.slice(2));
const date = args.date || localDate();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) usage('--date must use YYYY-MM-DD');

const entry = await fs.readFile(args.input, 'utf8');
if (!entry.trim()) usage('--input must not be empty');

const generatedId = crypto.createHash('sha256').update(entry.trim()).digest('hex').slice(0, 12);
const entryId = args.entryId || `entry-${generatedId}`;
if (!/^[a-zA-Z0-9._-]+$/.test(entryId)) usage('--entry-id may contain only letters, digits, dots, underscores, and hyphens');

const baseUrl = (process.env.SIVAN_NOTE_URL || '').replace(/\/$/, '');
if (!baseUrl) usage('SIVAN_NOTE_URL is required');

const token = process.env.SIVAN_NOTE_TOKEN || '';
const headers = { Accept: 'application/json' };
if (token) headers.Authorization = `Bearer ${token}`;

const docPath = `daily/${date}.md`;
const readUrl = `${baseUrl}/api/docs/content?path=${encodeURIComponent(docPath)}`;
const readResponse = await fetch(readUrl, { headers });
let current;

if (readResponse.status === 404) {
  current = defaultDocument(date);
} else {
  const body = await responseBody(readResponse);
  if (!readResponse.ok) {
    const detail = typeof body === 'string' ? body : body.error || body.message || JSON.stringify(body);
    throw new Error(`failed to read ${docPath}: HTTP ${readResponse.status} ${detail}`);
  }
  current = body.raw || body.content;
  if (typeof current !== 'string') throw new Error(`server returned no document content for ${docPath}`);
}

const merged = mergeEntry(current, entry, entryId);
if (args.dryRun) {
  process.stdout.write(merged);
  process.exit(0);
}

const writeResponse = await fetch(`${baseUrl}/api/docs/content`, {
  method: 'PUT',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: docPath, content: merged }),
});
const writeBody = await responseBody(writeResponse);
if (!writeResponse.ok) {
  const detail = typeof writeBody === 'string' ? writeBody : writeBody.error || writeBody.message || JSON.stringify(writeBody);
  throw new Error(`failed to write ${docPath}: HTTP ${writeResponse.status} ${detail}`);
}

const verifyResponse = await fetch(readUrl, { headers });
const verifyBody = await responseBody(verifyResponse);
if (!verifyResponse.ok || typeof verifyBody.raw !== 'string' || !verifyBody.raw.includes(`<!-- sivan-note-entry:${entryId}:start -->`)) {
  throw new Error(`write verification failed for ${docPath}`);
}

console.log(`Synced ${docPath} entry=${entryId} bytes=${writeBody.bytes ?? Buffer.byteLength(merged, 'utf8')}`);
