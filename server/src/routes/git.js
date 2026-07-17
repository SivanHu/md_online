import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import * as git from '../services/git.js';

const router = Router();

router.get('/status', asyncHandler(async (_req, res) => {
  res.json(await git.getStatus());
}));

router.get('/commits', asyncHandler(async (req, res) => {
  const commits = await git.getCommits({
    since: req.query.since,
    until: req.query.until,
    maxCount: Number(req.query.limit || 50),
  });
  res.json({ commits });
}));

router.get('/diff', asyncHandler(async (req, res) => {
  const paths = req.query.paths
    ? String(req.query.paths).split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const summary = await git.getDiffSummary({
    since: req.query.since,
    until: req.query.until,
    baseRef: req.query.baseRef,
    headRef: req.query.headRef || 'HEAD',
    paths,
    includeWorkingTree: req.query.includeWorkingTree !== 'false',
  });
  res.json(summary);
}));

router.get('/today', asyncHandler(async (req, res) => {
  res.json(await git.getTodayChanges(req.query.date));
}));

export default router;
