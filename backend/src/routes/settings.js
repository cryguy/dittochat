const express = require('express');
const { getModels } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { UserSettings } = getModels();
    const settings = await UserSettings.findByPk(req.user.id, { raw: true });
    res.json({
      system_prompt: settings?.system_prompt ?? '',
      suffix: settings?.suffix ?? '',
      model: settings?.model ?? '',
      naming_model: settings?.naming_model ?? null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    const { UserSettings } = getModels();
    const fields = ['system_prompt', 'suffix', 'model', 'naming_model'];
    const updates = { user_id: req.user.id };

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await UserSettings.upsert(updates);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
