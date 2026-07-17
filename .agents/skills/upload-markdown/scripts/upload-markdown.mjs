#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

function usage(message) {
  if (message) console.error(`Error: ${message}`);
  console.error('Usage: node upload-markdown.mjs --input <file.md> [--project <name>] [--path <project-path.md>] [--overwrite] [--dry-run]');
  process.exit(2);
}

function parseArgs(argv) {
  const args = { overwrite: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--overwrite' || arg === '--dry-run') {
      args[arg === '--overwrite' ? 'overwrite' : 'dryRun'] = true;
      continue;
    }
    if (!['--input', '--project', '--path'].includes(arg)) usage(`unknown argument: ${arg}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) usage(`missing value for ${arg}`);
    args[arg.slice(2)] = value;
  }
  if (!args.input) usage('--input is required');
  return args;
}

async function detectProject(explicitName) {
  if (explicitName) return explicitName;
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (root) return path.basename(root);
  } catch {}
  return path.basename(process.cwd());
}

function projectId(value) {
  const name = String(value || '').trim();
  if (!name || /[\r\n]/.test(name) || name.length > 100) usage('project name is invalid');
  const normalized = name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || `project-${crypto.createHash('sha256').update(name).digest('hex').slice(0, 10)}`;
}

function validateDestination(value) {
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized)) usage('--path must be relative to the project directory');
  if (normalized.split('/').includes('..')) usage('--path must not contain ..');
  if (!/\.(md|markdown|mdx)$/i.test(normalized)) usage('destination must be a Markdown file');
  return normalized;
}

async function responseBody(response) {
  const type = response.headers.get('content-type') || '';
  return type.includes('application/json') ? response.json() : response.text();
}

const args = parseArgs(process.argv.slice(2));
if (!/\.(md|markdown|mdx)$/i.test(args.input)) usage('input must be a Markdown file');
const content = await fs.readFile(args.input, 'utf8');
const project = await detectProject(args.project);
const projectDirectory = projectId(project);
const relativeDestination = validateDestination(args.path || `documents/${path.basename(args.input)}`);
const destination = `projects/${projectDirectory}/${relativeDestination}`;
const baseUrl = (process.env.SIVAN_NOTE_URL || '').replace(/\/$/, '');
if (!baseUrl) usage('SIVAN_NOTE_URL is required');
const token = process.env.SIVAN_NOTE_TOKEN || '';
const headers = { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
const readUrl = `${baseUrl}/api/docs/content?path=${encodeURIComponent(destination)}`;

if (args.dryRun) {
  console.log(`Ready to upload ${args.input} -> ${destination} project=${project} bytes=${Buffer.byteLength(content, 'utf8')}`);
  process.exit(0);
}

const existingResponse = await fetch(readUrl, { headers });
if (existingResponse.ok && !args.overwrite) {
  throw new Error(`${destination} already exists; use --overwrite only after the user approves replacement`);
}
if (!existingResponse.ok && existingResponse.status !== 404) {
  const body = await responseBody(existingResponse);
  throw new Error(`failed to check ${destination}: HTTP ${existingResponse.status} ${body.error || body.message || body}`);
}

const writeResponse = await fetch(`${baseUrl}/api/docs/content`, {
  method: 'PUT',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: destination, content }),
});
const writeBody = await responseBody(writeResponse);
if (!writeResponse.ok) throw new Error(`failed to upload ${destination}: HTTP ${writeResponse.status} ${writeBody.error || writeBody.message || writeBody}`);

const verifyResponse = await fetch(readUrl, { headers });
const verifyBody = await responseBody(verifyResponse);
if (!verifyResponse.ok || verifyBody.raw !== content) throw new Error(`upload verification failed for ${destination}`);

console.log(`Uploaded ${args.input} -> ${destination} bytes=${writeBody.bytes ?? Buffer.byteLength(content, 'utf8')}`);
