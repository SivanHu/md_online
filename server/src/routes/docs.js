import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import { parseDocWriteBody } from '../utils/validate.js';
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

router.get('/exists', asyncHandler(async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'query path is required' });
  }
  const exists = await docs.docExists(String(filePath));
  res.json({ path: String(filePath), exists });
}));

router.put('/content', asyncHandler(async (req, res) => {
  const body = {
    path: req.body?.path || req.query.path,
    content: req.body?.content,
  };
  const { path: filePath, content } = parseDocWriteBody(body);
  const result = await docs.saveDocContent(filePath, content);
  res.json(result);
}));

router.get('/search', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '');
  const limit = Math.min(Number(req.query.limit || 50) || 50, 200);
  const results = await docs.searchDocs(q, { limit });
  res.json({ query: q, results });
}));

router.get('/recent', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 10) || 10, 50);
  const items = await docs.listRecentDocs({ limit });
  res.json({ items });
}));

export default router;
