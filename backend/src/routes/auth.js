const express = require('express');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun, dbAll } = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public endpoint to get registration status
router.get('/registration-status', (req, res) => {
  const regEnabled = dbGet("SELECT value FROM app_settings WHERE key = 'registration_enabled'");
  const inviteOnly = dbGet("SELECT value FROM app_settings WHERE key = 'invite_only'");
  res.json({
    registrationEnabled: regEnabled?.value === 'true',
    inviteOnly: inviteOnly?.value === 'true'
  });
});

router.post('/register', async (req, res) => {
  const { username, password, inviteCode } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3 || password.length < 6) return res.status(400).json({ error: 'Username min 3 chars, password min 6 chars' });

  // Check if registration is enabled
  const regEnabled = dbGet("SELECT value FROM app_settings WHERE key = 'registration_enabled'");
  if (regEnabled?.value !== 'true') {
    return res.status(403).json({ error: 'Registration is disabled' });
  }

  // Check if invite-only mode is enabled
  const inviteOnly = dbGet("SELECT value FROM app_settings WHERE key = 'invite_only'");
  let validInvite = null;
  if (inviteOnly?.value === 'true') {
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code required' });
    }
    // Validate invite code
    const now = Math.floor(Date.now() / 1000);
    validInvite = dbGet(`
      SELECT * FROM invite_codes
      WHERE code = ? AND (max_uses = 0 OR uses < max_uses) AND (expires_at IS NULL OR expires_at > ?)
    `, [inviteCode, now]);
    if (!validInvite) {
      return res.status(400).json({ error: 'Invalid or expired invite code' });
    }
  }

  const existing = dbGet('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(400).json({ error: 'Username already exists' });

  try {
    // Check if this will be the first user (make them admin)
    const userCount = dbGet('SELECT COUNT(*) as count FROM users');
    const isFirstUser = userCount?.count === 0;

    const hash = await bcrypt.hash(password, 10);
    const result = dbRun('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)', [username, hash, isFirstUser ? 1 : 0]);

    // Increment invite code usage if used
    if (validInvite) {
      dbRun('UPDATE invite_codes SET uses = uses + 1 WHERE id = ?', [validInvite.id]);
    }

    const token = generateToken();
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    dbRun('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [token, result.lastInsertRowid, expiresAt]);
    res.json({ token, username, isAdmin: isFirstUser });
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
  res.json({ token, username: user.username, isAdmin: !!user.is_admin });
});

router.post('/logout', authMiddleware, (req, res) => {
  dbRun('DELETE FROM sessions WHERE token = ?', [req.token]);
  res.json({ success: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ username: req.user.username, isAdmin: req.user.isAdmin });
});

module.exports = router;
