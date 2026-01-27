const express = require('express');
const { dbGet, dbAll, getDb, saveDatabase } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get model prompt settings
router.get('/', authMiddleware, (req, res) => {
  const settings = dbAll('SELECT model, prompt_id, is_global FROM model_prompt_settings WHERE user_id = ?', [req.user.id]);
  const result = {};
  for (const s of settings) {
    // Return negative IDs for global prompts
    result[s.model] = s.is_global ? -s.prompt_id : s.prompt_id;
  }
  res.json(result);
});

// Set prompt for a specific model
router.put('/:model', authMiddleware, (req, res) => {
  const { prompt_id } = req.body;
  const model = decodeURIComponent(req.params.model);

  let isGlobal = 0;
  let actualPromptId = prompt_id;

  if (prompt_id !== null && prompt_id !== undefined) {
    if (prompt_id < 0) {
      // Global prompt (negative ID)
      isGlobal = 1;
      actualPromptId = -prompt_id; // Convert back to positive for storage
      const prompt = dbGet('SELECT id FROM global_prompts WHERE id = ?', [actualPromptId]);
      if (!prompt) return res.status(400).json({ error: 'Invalid prompt_id' });
    } else {
      // User prompt
      const prompt = dbGet('SELECT id FROM custom_prompts WHERE id = ? AND user_id = ?', [prompt_id, req.user.id]);
      if (!prompt) return res.status(400).json({ error: 'Invalid prompt_id' });
    }
  }

  const db = getDb();
  const existing = dbGet('SELECT * FROM model_prompt_settings WHERE user_id = ? AND model = ?', [req.user.id, model]);
  if (existing) {
    db.run('UPDATE model_prompt_settings SET prompt_id = ?, is_global = ? WHERE user_id = ? AND model = ?', [actualPromptId, isGlobal, req.user.id, model]);
  } else {
    db.run('INSERT INTO model_prompt_settings (user_id, model, prompt_id, is_global) VALUES (?, ?, ?, ?)', [req.user.id, model, actualPromptId, isGlobal]);
  }
  saveDatabase();
  res.json({ success: true });
});

// Get effective prompt for a model
router.get('/:model/effective', authMiddleware, (req, res) => {
  const model = decodeURIComponent(req.params.model);
  const modelSetting = dbGet('SELECT prompt_id, is_global FROM model_prompt_settings WHERE user_id = ? AND model = ?', [req.user.id, model]);

  if (modelSetting?.prompt_id) {
    if (modelSetting.is_global) {
      const prompt = dbGet('SELECT * FROM global_prompts WHERE id = ?', [modelSetting.prompt_id]);
      if (prompt) {
        return res.json({ source: 'global', prompt_id: -prompt.id, name: prompt.name, system_prompt: prompt.system_prompt, suffix: prompt.suffix });
      }
    } else {
      const prompt = dbGet('SELECT * FROM custom_prompts WHERE id = ?', [modelSetting.prompt_id]);
      if (prompt) {
        return res.json({ source: 'custom', prompt_id: prompt.id, name: prompt.name, system_prompt: prompt.system_prompt, suffix: prompt.suffix });
      }
    }
  }

  // Default: empty prompt
  const settings = dbGet('SELECT system_prompt, suffix FROM user_settings WHERE user_id = ?', [req.user.id]);
  res.json({
    source: 'default',
    prompt_id: null,
    name: 'Default',
    system_prompt: settings?.system_prompt ?? '',
    suffix: settings?.suffix ?? ''
  });
});

module.exports = router;
