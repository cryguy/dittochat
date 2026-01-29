const express = require('express');
const bcrypt = require('bcryptjs');
const { getModels, getSequelize, Op } = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public endpoint to get registration status
router.get('/registration-status', async (req, res) => {
  try {
    const { AppSetting } = getModels();
    const regEnabled = await AppSetting.findByPk('registration_enabled');
    const inviteOnly = await AppSetting.findByPk('invite_only');
    res.json({
      registrationEnabled: regEnabled?.value === 'true',
      inviteOnly: inviteOnly?.value === 'true'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/register', async (req, res) => {
  const { username, password, inviteCode } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3 || password.length < 6) return res.status(400).json({ error: 'Username min 3 chars, password min 6 chars' });

  try {
    const { User, Session, AppSetting, InviteCode } = getModels();

    // Check if registration is enabled
    const regEnabled = await AppSetting.findByPk('registration_enabled');
    if (regEnabled?.value !== 'true') {
      return res.status(403).json({ error: 'Registration is disabled' });
    }

    // Check if invite-only mode is enabled
    const inviteOnly = await AppSetting.findByPk('invite_only');
    let validInvite = null;
    if (inviteOnly?.value === 'true') {
      if (!inviteCode) {
        return res.status(400).json({ error: 'Invite code required' });
      }
      const now = Math.floor(Date.now() / 1000);
      const sequelize = getSequelize();
      validInvite = await InviteCode.findOne({
        where: {
          code: inviteCode,
          [Op.and]: [
            { [Op.or]: [{ max_uses: 0 }, { uses: { [Op.lt]: sequelize.col('max_uses') } }] },
            { [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }] }
          ]
        }
      });
      if (!validInvite) {
        return res.status(400).json({ error: 'Invalid or expired invite code' });
      }
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    // Check if this will be the first user (make them admin)
    const userCount = await User.count();
    const isFirstUser = userCount === 0;

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password_hash: hash,
      is_admin: isFirstUser ? 1 : 0
    });

    // Increment invite code usage if used
    if (validInvite) {
      await validInvite.increment('uses');
    }

    const token = generateToken();
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    await Session.create({ token, user_id: user.id, expires_at: expiresAt });
    res.json({ token, username, isAdmin: isFirstUser });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const { User, Session } = getModels();

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken();
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    await Session.create({ token, user_id: user.id, expires_at: expiresAt });
    res.json({ token, username: user.username, isAdmin: !!user.is_admin });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const { Session } = getModels();
    await Session.destroy({ where: { token: req.token } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ username: req.user.username, isAdmin: req.user.isAdmin });
});

module.exports = router;
