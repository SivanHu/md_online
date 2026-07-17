import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import config from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './utils/errors.js';
import docsRouter from './routes/docs.js';
import gitRouter from './routes/git.js';
import summaryRouter from './routes/summary.js';
import { projectIdentity } from './utils/project.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(authMiddleware);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'sivan-note',
    time: new Date().toISOString(),
    docsRoot: path.relative(config.projectRoot, config.docsRoot) || 'docs',
    llmEnabled: config.llm.enabled,
    allowWrite: config.allowWrite,
  });
});

app.get('/api/config', (_req, res) => {
  const defaultProject = projectIdentity(config.defaultProject);
  res.json({
    docsRoot: path.relative(config.projectRoot, config.docsRoot).replace(/\\/g, '/') || 'docs',
    projectsRoot: path.relative(config.projectRoot, config.projectsDir).replace(/\\/g, '/') || 'docs/projects',
    defaultProject: defaultProject.name,
    defaultProjectId: defaultProject.id,
    gitRepoPath: path.relative(config.projectRoot, config.gitRepoPath).replace(/\\/g, '/') || '.',
    allowWrite: config.allowWrite,
    llmEnabled: config.llm.enabled,
    llmModel: config.llm.enabled ? config.llm.model : null,
    summaryLanguage: config.summary.language,
    summaryStyle: config.summary.defaultStyle,
    authRequired: Boolean(config.authToken),
  });
});

app.use('/api/docs', docsRouter);
app.use('/api/git', gitRouter);
app.use('/api/summary', summaryRouter);

// Serve built client if present
const clientDist = path.join(config.projectRoot, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(config.port, config.host, () => {
  console.log(`Sivan Note server listening on http://${config.host}:${config.port}`);
  console.log(`docs: ${config.docsRoot}`);
  console.log(`git:  ${config.gitRepoPath}`);
  console.log(`llm:  ${config.llm.enabled ? config.llm.model : 'disabled (template mode)'}`);
});
