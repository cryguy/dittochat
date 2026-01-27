const express = require('express');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3 || password.length < 6) return res.status(400).json({ error: 'Username min 3 chars, password min 6 chars' });

  const existing = dbGet('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(400).json({ error: 'Username already exists' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = dbRun('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    const token = generateToken();
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    dbRun('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [token, result.lastInsertRowid, expiresAt]);
    res.json({ token, username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = dbGet('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken();
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  dbRun('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [token, user.id, expiresAt]);
  res.json({ token, username: user.username });
});

router.post('/logout', authMiddleware, (req, res) => {
  dbRun('DELETE FROM sessions WHERE token = ?', [req.token]);
  res.json({ success: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ username: req.user.username });
});

module.exports = router;
