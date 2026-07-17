import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import {
  generateDailySummary,
  buildStatsSvg,
  modulesFromFiles,
} from '../services/summary.js';
import { getTodayChanges } from '../services/git.js';
import { saveDocContent } from '../services/docs.js';

const router = Router();

function parseBody(req) {
  const body = req.body || {};
  const paths = Array.isArray(body.paths)
    ? body.paths
    : body.paths
      ? String(body.paths).split(',').map((s) => s.trim()).filter(Boolean)
      : [];
  return { ...body, paths };
}

router.post('/daily', asyncHandler(async (req, res) => {
  const body = parseBody(req);
  const result = await generateDailySummary({
    date: body.date,
    since: body.since,
    until: body.until,
    baseRef: body.baseRef,
    headRef: body.headRef,
    paths: body.paths,
    style: body.style,
    language: body.language,
    save: Boolean(body.save),
    outputPath: body.outputPath,
    customNotes: body.customNotes || body.notes,
    includeWorkingTree: body.includeWorkingTree !== false,
    useLlm: body.useLlm,
  });
  res.json(result);
}));

router.post('/preview', asyncHandler(async (req, res) => {
  const body = parseBody(req);
  const result = await generateDailySummary({
    ...body,
    save: false,
  });
  res.json(result);
}));

router.post('/save', asyncHandler(async (req, res) => {
  const { path: filePath, content } = req.body || {};
  if (!filePath || typeof content !== 'string') {
    return res.status(400).json({ error: 'path and content are required' });
  }
  const result = await saveDocContent(String(filePath), content);
  res.json(result);
}));

router.get('/stats.svg', asyncHandler(async (req, res) => {
  const changes = await getTodayChanges(req.query.date);
  const modules = modulesFromFiles(changes.files);
  const svg = buildStatsSvg(changes.stats, modules);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(svg);
}));

export default router;
