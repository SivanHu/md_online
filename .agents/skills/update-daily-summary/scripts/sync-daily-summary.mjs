#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

function usage(message) {
  if (message) console.error(`Error: ${message}`);
  console.error('Usage: node sync-daily-summary.mjs --input <entry.md> [--entry-id <id>] [--project <name>] [--date YYYY-MM-DD] [--dry-run]');
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
    if (!['--input', '--entry-id', '--project', '--date'].includes(arg)) usage(`unknown argument: ${arg}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) usage(`missing value for ${arg}`);
    args[arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  if (!args.input) usage('--input is required');
  return args;
}

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function detectProject(explicitName) {
  if (explicitName) return explicitName;
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (root) return path.basename(root);
  } catch {}
  try {
    const pkg = JSON.parse(await fs.readFile(path.resolve('package.json'), 'utf8'));
    if (pkg.name) return String(pkg.name).split('/').pop();
  } catch {}
  return path.basename(process.cwd());
}

function stableId(value) {
  const normalized = value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || `project-${crypto.createHash('sha256').update(value).digest('hex').slice(0, 10)}`;
}

function defaultDocument(date, project) {
  return `---\ntitle: ${project} · 每日工作总结 · ${date}\ndate: ${date}\nproject: ${project}\ntags: [daily, codex]\ngenerated_by: codex\n---\n\n# ${project} · ${date} 工作总结\n`;
}

function removeMarkedBlock(document, start, end) {
  const startIndex = document.indexOf(start);
  if (startIndex === -1) return document;
  const endIndex = document.indexOf(end, startIndex + start.length);
  if (endIndex === -1) throw new Error(`found start marker without end marker: ${start}`);
  return `${document.slice(0, startIndex).trimEnd()}\n${document.slice(endIndex + end.length).trimStart()}`;
}

function mergeEntry(document, entry, entryId) {
  const entryStart = `<!-- sivan-note-entry:${entryId}:start -->`;
  const entryEnd = `<!-- sivan-note-entry:${entryId}:end -->`;
  const entryBlock = `${entryStart}\n${entry.trim()}\n${entryEnd}`;
  const cleaned = removeMarkedBlock(document, entryStart, entryEnd);
  return `${cleaned.trimEnd()}\n\n${entryBlock}\n`;
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

const project = (await detectProject(args.project)).trim();
if (!project || /[\r\n]/.test(project) || project.length > 100) usage('project name is invalid');
const projectId = stableId(project);
const generatedId = crypto.createHash('sha256').update(entry.trim()).digest('hex').slice(0, 12);
const taskId = args.entryId || `entry-${generatedId}`;
if (!/^[a-zA-Z0-9._-]+$/.test(taskId)) usage('--entry-id may contain only letters, digits, dots, underscores, and hyphens');
const entryId = taskId;

const baseUrl = (process.env.SIVAN_NOTE_URL || '').replace(/\/$/, '');
if (!baseUrl) usage('SIVAN_NOTE_URL is required');
const token = process.env.SIVAN_NOTE_TOKEN || '';
const headers = { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
const docPath = `projects/${projectId}/daily/${date}.md`;
const readUrl = `${baseUrl}/api/docs/content?path=${encodeURIComponent(docPath)}`;
const readResponse = await fetch(readUrl, { headers });
let current;

if (readResponse.status === 404) {
  current = defaultDocument(date, project);
} else {
  const body = await responseBody(readResponse);
  if (!readResponse.ok) throw new Error(`failed to read ${docPath}: HTTP ${readResponse.status} ${body.error || body.message || body}`);
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
if (!writeResponse.ok) throw new Error(`failed to write ${docPath}: HTTP ${writeResponse.status} ${writeBody.error || writeBody.message || writeBody}`);

const verifyResponse = await fetch(readUrl, { headers });
const verifyBody = await responseBody(verifyResponse);
if (!verifyResponse.ok || typeof verifyBody.raw !== 'string' || !verifyBody.raw.includes(`<!-- sivan-note-entry:${entryId}:start -->`)) {
  throw new Error(`write verification failed for ${docPath}`);
}

console.log(`Synced ${docPath} project=${project} entry=${entryId} bytes=${writeBody.bytes ?? Buffer.byteLength(merged, 'utf8')}`);
