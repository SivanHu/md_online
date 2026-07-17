import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(projectRoot, '.env') });

function bool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function resolveFromRoot(p, fallback) {
  const raw = p || fallback;
  return path.isAbsolute(raw) ? raw : path.resolve(projectRoot, raw);
}

const docsRoot = resolveFromRoot(process.env.DOCS_ROOT, './docs');
const projectsDir = resolveFromRoot(process.env.PROJECTS_DIR, './docs/projects');
const gitRepoPath = resolveFromRoot(process.env.GIT_REPO_PATH, '.');

export const config = {
  projectRoot,
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 8787),
  authToken: process.env.AUTH_TOKEN || '',
  docsRoot,
  projectsDir,
  gitRepoPath,
  defaultProject: process.env.PROJECT_NAME || path.basename(gitRepoPath),
  allowWrite: bool(process.env.ALLOW_WRITE, true),
  llm: {
    enabled: bool(process.env.LLM_ENABLED, false) && Boolean(process.env.OPENAI_API_KEY),
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  summary: {
    language: process.env.SUMMARY_LANGUAGE || 'zh-CN',
    defaultStyle: process.env.SUMMARY_STYLE || 'daily_standup',
    maxDiffChars: Number(process.env.MAX_DIFF_CHARS || 120000),
  },
};

export default config;
