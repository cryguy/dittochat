const crypto = require('crypto');
const { dbGet } = require('../db');

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const now = Math.floor(Date.now() / 1000);
  const session = dbGet(`
    SELECT s.user_id, u.username FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `, [token, now]);

  if (!session) return res.status(401).json({ error: 'Session expired' });

  req.user = { id: session.user_id, username: session.username };
  req.token = token;
  next();
}

function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const now = Math.floor(Date.now() / 1000);
    const session = dbGet(`
      SELECT s.user_id, u.username FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `, [token, now]);
    if (session) req.user = { id: session.user_id, username: session.username };
  }
  next();
}

module.exports = {
  generateToken,
  authMiddleware,
  optionalAuthMiddleware
};
