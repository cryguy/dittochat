const express = require('express');
const { getModels } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all prompts for user (user prompts + global prompts)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { CustomPrompt, GlobalPrompt } = getModels();

    const userPrompts = await CustomPrompt.findAll({
      where: { user_id: req.user.id },
      attributes: ['id', 'name', 'description', 'system_prompt', 'suffix'],
      order: [['name', 'ASC']],
      raw: true
    });
    const globalPrompts = await GlobalPrompt.findAll({
      attributes: ['id', 'name', 'description', 'system_prompt', 'suffix'],
      order: [['name', 'ASC']],
      raw: true
    });

    const userWithFlag = userPrompts.map(p => ({ ...p, is_global: 0 }));
    const globalWithNegativeIds = globalPrompts.map(p => ({ ...p, id: -p.id, is_global: 1 }));
    res.json([...userWithFlag, ...globalWithNegativeIds]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create custom prompt
router.post('/', authMiddleware, async (req, res) => {
  const { name, description, system_prompt, suffix } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  try {
    const { CustomPrompt } = getModels();
    const prompt = await CustomPrompt.create({
      user_id: req.user.id,
      name,
      description: description || '',
      system_prompt: system_prompt || '',
      suffix: suffix || ''
    });
    res.json({ id: prompt.id, name, description: description || '', system_prompt: system_prompt || '', suffix: suffix || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update custom prompt
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, description, system_prompt, suffix } = req.body;

  try {
    const { CustomPrompt } = getModels();
    const prompt = await CustomPrompt.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

    await prompt.update({
      name: name || prompt.name,
      description: description ?? prompt.description,
      system_prompt: system_prompt ?? prompt.system_prompt,
      suffix: suffix ?? prompt.suffix
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete custom prompt
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { CustomPrompt } = getModels();
    const prompt = await CustomPrompt.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

    await prompt.destroy();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
