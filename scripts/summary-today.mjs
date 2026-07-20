#!/usr/bin/env node
/**
 * CLI helper: generate today's daily summary via local API.
 * Usage: npm run summary:today
 *        node scripts/summary-today.mjs --save
 *        node scripts/summary-today.mjs --save --force
 */
const port = process.env.PORT || 8787;
const base = process.env.SIVAN_NOTE_URL || `http://127.0.0.1:${port}`;
const save = process.argv.includes('--save');
const force = process.argv.includes('--force');
const token = process.env.AUTH_TOKEN || process.env.SIVAN_NOTE_TOKEN || '';

const body = {
  save,
  force,
  project: process.env.PROJECT_NAME || undefined,
  language: process.env.SUMMARY_LANGUAGE || 'zh-CN',
  style: process.env.SUMMARY_STYLE || 'daily_standup',
  includeWorkingTree: true,
};

const headers = { 'Content-Type': 'application/json' };
if (token) headers.Authorization = `Bearer ${token}`;

const res = await fetch(`${base}/api/summary/daily`, {
  method: 'POST',
  headers,
  body: JSON.stringify(body),
});

const data = await res.json();
if (!res.ok) {
  console.error('Failed:', data);
  process.exit(1);
}

console.log(`mode=${data.mode} files=${data.stats?.filesChanged} +${data.stats?.insertions}/-${data.stats?.deletions}`);
if (data.fallbackReason) console.log(`fallback=${data.fallbackReason}`);
if (data.savedPath) console.log(`saved=${data.savedPath}`);
console.log('\n--- summary ---\n');
console.log(data.summaryMarkdown);
