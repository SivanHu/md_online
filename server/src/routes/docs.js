import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import * as docs from '../services/docs.js';

const router = Router();

router.get('/tree', asyncHandler(async (_req, res) => {
  const tree = await docs.getDocTree();
  res.json(tree);
}));

router.get('/content', asyncHandler(async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'query path is required' });
  }
  const doc = await docs.getDocContent(String(filePath));
  res.json(doc);
}));

router.put('/content', asyncHandler(async (req, res) => {
  const filePath = req.body?.path || req.query.path;
  const content = req.body?.content;
  if (!filePath) return res.status(400).json({ error: 'path is required' });
  if (typeof content !== 'string') return res.status(400).json({ error: 'content string is required' });
  const result = await docs.saveDocContent(String(filePath), content);
  res.json(result);
}));

router.get('/search', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '');
  const limit = Number(req.query.limit || 50);
  const results = await docs.searchDocs(q, { limit });
  res.json({ query: q, results });
}));

router.get('/recent', asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 10);
  const items = await docs.listRecentDocs({ limit });
  res.json({ items });
}));

export default router;
