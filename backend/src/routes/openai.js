const express = require('express');
const crypto = require('crypto');
const { getModels } = require('../db');
const { optionalAuthMiddleware } = require('../middleware/auth');
const { getOpenAIClient } = require('../services/openai');
const { buildApiMessages } = require('../utils/messages');

const router = express.Router();

async function getUserSettings(userId) {
  if (userId) {
    const { UserSettings } = getModels();
    const s = await UserSettings.findByPk(userId, { raw: true });
    return {
      systemPrompt: s?.system_prompt ?? '',
      suffix: s?.suffix ?? '',
      model: s?.model ?? ''
    };
  }
  return { systemPrompt: '', suffix: '', model: '' };
}

router.get('/models', optionalAuthMiddleware, async (req, res) => {
  try {
    const client = getOpenAIClient();
    const models = await client.models.list();
    res.json({
      object: 'list',
      data: models.data.map(m => ({
        id: m.id,
        object: 'model',
        created: m.created || Math.floor(Date.now() / 1000),
        owned_by: m.owned_by || 'system'
      }))
    });
  } catch (e) {
    res.status(500).json({ error: { message: e.message, type: 'server_error' } });
  }
});

router.post('/chat/completions', optionalAuthMiddleware, async (req, res) => {
  const { messages, model, stream = false, ...otherParams } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'messages required', type: 'invalid_request_error' } });
  }

  const settings = await getUserSettings(req.user?.id);
  const apiMessages = buildApiMessages(messages, settings.systemPrompt, settings.suffix);
  const requestModel = model || settings.model || 'gpt-4o-mini';
  const client = getOpenAIClient();

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResponse = await client.chat.completions.create({
        model: requestModel,
        messages: apiMessages,
        stream: true,
        ...otherParams
      });

      const completionId = `chatcmpl-${crypto.randomBytes(12).toString('hex')}`;
      const created = Math.floor(Date.now() / 1000);

      for await (const chunk of streamResponse) {
        const delta = chunk.choices[0]?.delta || {};
        const finishReason = chunk.choices[0]?.finish_reason || null;
        res.write(`data: ${JSON.stringify({
          id: completionId,
          object: 'chat.completion.chunk',
          created,
          model: requestModel,
          choices: [{ index: 0, delta, finish_reason: finishReason }]
        })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const completion = await client.chat.completions.create({
        model: requestModel,
        messages: apiMessages,
        stream: false,
        ...otherParams
      });

      res.json({
        id: completion.id || `chatcmpl-${crypto.randomBytes(12).toString('hex')}`,
        object: 'chat.completion',
        created: completion.created || Math.floor(Date.now() / 1000),
        model: requestModel,
        choices: completion.choices,
        usage: completion.usage
      });
    }
  } catch (e) {
    if (stream) {
      res.write(`data: ${JSON.stringify({ error: { message: e.message } })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: { message: e.message, type: 'server_error' } });
    }
  }
});

module.exports = router;
