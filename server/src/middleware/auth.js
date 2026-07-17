import config from '../config.js';

export function authMiddleware(req, res, next) {
  if (!config.authToken) return next();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : req.headers['x-auth-token'];
  if (token !== config.authToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}
