import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import { asStringArray, asBoolean } from '../utils/validate.js';
import * as git from '../services/git.js';

const router = Router();

router.get('/status', asyncHandler(async (_req, res) => {
  res.json(await git.getStatus());
}));

router.get('/commits', asyncHandler(async (req, res) => {
  const paths = asStringArray(req.query.paths);
  const commits = await git.getCommits({
    since: req.query.since,
    until: req.query.until,
    maxCount: Math.min(Number(req.query.limit || 50) || 50, 200),
    paths,
  });
  res.json({ commits });
}));

router.get('/diff', asyncHandler(async (req, res) => {
  const paths = asStringArray(req.query.paths);
  const summary = await git.getDiffSummary({
    since: req.query.since,
    until: req.query.until,
    baseRef: req.query.baseRef,
    headRef: req.query.headRef || 'HEAD',
    paths,
    includeWorkingTree: asBoolean(req.query.includeWorkingTree, true),
  });
  res.json(summary);
}));

router.get('/today', asyncHandler(async (req, res) => {
  const paths = asStringArray(req.query.paths);
  res.json(
    await git.getTodayChanges(req.query.date, {
      paths,
      includeWorkingTree: asBoolean(req.query.includeWorkingTree, true),
      baseRef: req.query.baseRef || undefined,
      headRef: req.query.headRef || 'HEAD',
    }),
  );
}));

export default router;
