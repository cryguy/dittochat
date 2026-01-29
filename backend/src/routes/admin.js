const express = require('express');
const crypto = require('crypto');
const { getModels, getSequelize } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');

const router = express.Router();

// All admin routes require auth + admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Get app settings
router.get('/settings', async (req, res) => {
  try {
    const { AppSetting } = getModels();
    const regEnabled = await AppSetting.findByPk('registration_enabled');
    const inviteOnly = await AppSetting.findByPk('invite_only');
    res.json({
      registration_enabled: regEnabled?.value === 'true',
      invite_only: inviteOnly?.value === 'true'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update app settings
router.put('/settings', async (req, res) => {
  try {
    const { AppSetting } = getModels();
    const { registration_enabled, invite_only } = req.body;

    if (typeof registration_enabled === 'boolean') {
      await AppSetting.update(
        { value: registration_enabled ? 'true' : 'false' },
        { where: { key: 'registration_enabled' } }
      );
    }
    if (typeof invite_only === 'boolean') {
      await AppSetting.update(
        { value: invite_only ? 'true' : 'false' },
        { where: { key: 'invite_only' } }
      );
    }

    const regEnabled = await AppSetting.findByPk('registration_enabled');
    const invOnly = await AppSetting.findByPk('invite_only');
    res.json({
      registration_enabled: regEnabled?.value === 'true',
      invite_only: invOnly?.value === 'true'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all users with chat count
router.get('/users', async (req, res) => {
  try {
    const { User } = getModels();
    const sequelize = getSequelize();
    const users = await User.findAll({
      attributes: [
        'id', 'username', 'is_admin', 'created_at',
        [sequelize.literal('(SELECT COUNT(*) FROM chats WHERE chats.user_id = "User".id)'), 'chat_count']
      ],
      order: [['id', 'ASC']],
      raw: true
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  // Cannot delete yourself
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const { User } = getModels();

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if this is the last admin
    if (user.is_admin) {
      const adminCount = await User.count({ where: { is_admin: 1 } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin' });
      }
    }

    await user.destroy();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Toggle admin status
router.put('/users/:id/admin', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { isAdmin } = req.body;

  // Cannot demote yourself
  if (userId === req.user.id && !isAdmin) {
    return res.status(400).json({ error: 'Cannot demote yourself' });
  }

  try {
    const { User } = getModels();

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if this would remove the last admin
    if (user.is_admin && !isAdmin) {
      const adminCount = await User.count({ where: { is_admin: 1 } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin' });
      }
    }

    await user.update({ is_admin: isAdmin ? 1 : 0 });
    res.json({ success: true, isAdmin: !!isAdmin });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all invite codes
router.get('/invites', async (req, res) => {
  try {
    const { InviteCode, User } = getModels();
    const invites = await InviteCode.findAll({
      include: [{
        model: User,
        attributes: ['username']
      }],
      order: [['created_at', 'DESC']]
    });
    const result = invites.map(inv => {
      const plain = inv.get({ plain: true });
      return {
        id: plain.id,
        code: plain.code,
        max_uses: plain.max_uses,
        uses: plain.uses,
        expires_at: plain.expires_at,
        created_at: plain.created_at,
        created_by_username: plain.User?.username
      };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create invite code
router.post('/invites', async (req, res) => {
  const { maxUses = 1, expiresInDays } = req.body;

  try {
    const { InviteCode } = getModels();
    const code = crypto.randomBytes(8).toString('hex');
    const expiresAt = expiresInDays ? Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60 : null;

    const invite = await InviteCode.create({
      code,
      created_by: req.user.id,
      max_uses: maxUses,
      expires_at: expiresAt
    });

    res.json({
      id: invite.id,
      code,
      max_uses: maxUses,
      uses: 0,
      expires_at: expiresAt,
      created_at: invite.created_at,
      created_by_username: req.user.username
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete invite code
router.delete('/invites/:id', async (req, res) => {
  const inviteId = parseInt(req.params.id, 10);

  try {
    const { InviteCode } = getModels();
    const invite = await InviteCode.findByPk(inviteId);
    if (!invite) {
      return res.status(404).json({ error: 'Invite code not found' });
    }

    await invite.destroy();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
