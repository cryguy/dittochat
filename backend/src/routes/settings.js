const express = require('express');
const { dbGet, getDb, saveDatabase } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const settings = dbGet('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
  res.json({
    system_prompt: settings?.system_prompt ?? '',
    suffix: settings?.suffix ?? '',
    model: settings?.model ?? '',
    naming_model: settings?.naming_model ?? null
  });
});

router.put('/', authMiddleware, (req, res) => {
  const existing = dbGet('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
  const db = getDb();

  // Build update dynamically - only update fields that are provided
  const fields = ['system_prompt', 'suffix', 'model', 'naming_model'];
  const updates = [];
  const values = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (existing) {
    if (updates.length > 0) {
      values.push(req.user.id);
      db.run(`UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`, values);
    }
  } else {
    // For INSERT, use defaults for missing fields
    const insertFields = ['user_id'];
    const insertValues = [req.user.id];
    const placeholders = ['?'];

    for (const field of fields) {
      insertFields.push(field);
      placeholders.push('?');
      insertValues.push(req.body[field] !== undefined ? req.body[field] : (field === 'system_prompt' || field === 'suffix' ? '' : null));
    }

    db.run(`INSERT INTO user_settings (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`, insertValues);
  }

  saveDatabase();
  res.json({ success: true });
});

module.exports = router;
