const express = require('express');
const { dbGet, dbAll, dbRun, getDb, saveDatabase } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all prompts for user (user prompts + global prompts)
router.get('/', authMiddleware, (req, res) => {
  const userPrompts = dbAll('SELECT id, name, system_prompt, suffix, 0 as is_global FROM custom_prompts WHERE user_id = ? ORDER BY name', [req.user.id]);
  const globalPrompts = dbAll('SELECT id, name, system_prompt, suffix, 1 as is_global FROM global_prompts ORDER BY name');
  // Global prompts use negative IDs to distinguish them
  const globalWithNegativeIds = globalPrompts.map(p => ({ ...p, id: -p.id }));
  res.json([...userPrompts, ...globalWithNegativeIds]);
});

// Create custom prompt
router.post('/', authMiddleware, (req, res) => {
  const { name, system_prompt, suffix } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const result = dbRun(
    'INSERT INTO custom_prompts (user_id, name, system_prompt, suffix) VALUES (?, ?, ?, ?)',
    [req.user.id, name, system_prompt || '', suffix || '']
  );
  res.json({ id: result.lastInsertRowid, name, system_prompt: system_prompt || '', suffix: suffix || '' });
});

// Update custom prompt
router.put('/:id', authMiddleware, (req, res) => {
  const { name, system_prompt, suffix } = req.body;
  const prompt = dbGet('SELECT * FROM custom_prompts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const db = getDb();
  db.run(
    'UPDATE custom_prompts SET name = ?, system_prompt = ?, suffix = ? WHERE id = ?',
    [name || prompt.name, system_prompt ?? prompt.system_prompt, suffix ?? prompt.suffix, req.params.id]
  );
  saveDatabase();
  res.json({ success: true });
});

// Delete custom prompt
router.delete('/:id', authMiddleware, (req, res) => {
  const prompt = dbGet('SELECT * FROM custom_prompts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const db = getDb();
  db.run('DELETE FROM custom_prompts WHERE id = ?', [req.params.id]);
  db.run('UPDATE model_prompt_settings SET prompt_id = NULL WHERE prompt_id = ?', [req.params.id]);
  saveDatabase();
  res.json({ success: true });
});

module.exports = router;
