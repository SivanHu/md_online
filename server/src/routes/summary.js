import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import {
  generateDailySummary,
  buildStatsSvg,
  modulesFromFiles,
} from '../services/summary.js';
import { getTodayChanges, getDiffSummary } from '../services/git.js';
import { saveDocContent } from '../services/docs.js';
import { parseSummaryOptions, parseDocWriteBody, asStringArray, asBoolean } from '../utils/validate.js';

const router = Router();

router.post('/daily', asyncHandler(async (req, res) => {
  const body = parseSummaryOptions(req.body || {});
  const result = await generateDailySummary(body);
  res.json(result);
}));

router.post('/preview', asyncHandler(async (req, res) => {
  const body = parseSummaryOptions(req.body || {});
  const result = await generateDailySummary({
    ...body,
    save: false,
  });
  res.json(result);
}));

router.post('/save', asyncHandler(async (req, res) => {
  const { path: filePath, content } = parseDocWriteBody(req.body || {});
  const result = await saveDocContent(filePath, content);
  res.json(result);
}));

router.get('/stats.svg', asyncHandler(async (req, res) => {
  const paths = asStringArray(req.query.paths);
  const includeWorkingTree = asBoolean(req.query.includeWorkingTree, true);
  const baseRef = req.query.baseRef ? String(req.query.baseRef) : undefined;
  const headRef = req.query.headRef ? String(req.query.headRef) : 'HEAD';
  const theme = req.query.theme === 'dark' ? 'dark' : 'light';

  let changes;
  if (baseRef) {
    changes = await getDiffSummary({
      baseRef,
      headRef,
      paths,
      includeWorkingTree,
    });
  } else {
    changes = await getTodayChanges(req.query.date, {
      paths,
      includeWorkingTree,
    });
  }

  const modules = modulesFromFiles(changes.files);
  const svg = buildStatsSvg(changes.stats, modules, { theme });
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(svg);
}));

export default router;
