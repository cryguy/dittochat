const express = require('express');
const { getModels } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get model prompt settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { ModelPromptSetting } = getModels();
    const settings = await ModelPromptSetting.findAll({
      where: { user_id: req.user.id },
      attributes: ['model', 'prompt_id', 'is_global'],
      raw: true
    });
    const result = {};
    for (const s of settings) {
      // Return negative IDs for global prompts
      result[s.model] = s.is_global ? -s.prompt_id : s.prompt_id;
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Set prompt for a specific model
router.put('/:model', authMiddleware, async (req, res) => {
  const { prompt_id } = req.body;
  const model = decodeURIComponent(req.params.model);

  try {
    const { ModelPromptSetting, GlobalPrompt, CustomPrompt } = getModels();

    let isGlobal = 0;
    let actualPromptId = prompt_id;

    if (prompt_id !== null && prompt_id !== undefined) {
      if (prompt_id < 0) {
        // Global prompt (negative ID)
        isGlobal = 1;
        actualPromptId = -prompt_id; // Convert back to positive for storage
        const prompt = await GlobalPrompt.findByPk(actualPromptId);
        if (!prompt) return res.status(400).json({ error: 'Invalid prompt_id' });
      } else {
        // User prompt
        const prompt = await CustomPrompt.findOne({
          where: { id: prompt_id, user_id: req.user.id }
        });
        if (!prompt) return res.status(400).json({ error: 'Invalid prompt_id' });
      }
    }

    await ModelPromptSetting.upsert({
      user_id: req.user.id,
      model,
      prompt_id: actualPromptId,
      is_global: isGlobal
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get effective prompt for a model
router.get('/:model/effective', authMiddleware, async (req, res) => {
  const model = decodeURIComponent(req.params.model);

  try {
    const { ModelPromptSetting, GlobalPrompt, CustomPrompt, UserSettings } = getModels();

    const modelSetting = await ModelPromptSetting.findOne({
      where: { user_id: req.user.id, model },
      raw: true
    });

    if (modelSetting?.prompt_id) {
      if (modelSetting.is_global) {
        const prompt = await GlobalPrompt.findByPk(modelSetting.prompt_id, { raw: true });
        if (prompt) {
          return res.json({ source: 'global', prompt_id: -prompt.id, name: prompt.name, system_prompt: prompt.system_prompt, suffix: prompt.suffix });
        }
      } else {
        const prompt = await CustomPrompt.findByPk(modelSetting.prompt_id, { raw: true });
        if (prompt) {
          return res.json({ source: 'custom', prompt_id: prompt.id, name: prompt.name, system_prompt: prompt.system_prompt, suffix: prompt.suffix });
        }
      }
    }

    // Default: empty prompt
    const settings = await UserSettings.findByPk(req.user.id, { raw: true });
    res.json({
      source: 'default',
      prompt_id: null,
      name: 'Default',
      system_prompt: settings?.system_prompt ?? '',
      suffix: settings?.suffix ?? ''
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
