const express = require('express');
const crypto = require('crypto');
const { getModels } = require('../db');
const { optionalAuthMiddleware } = require('../middleware/auth');
const { getOllamaClient, resolveThink, listModels } = require('../services/ollama');
const { buildApiMessages } = require('../utils/messages');
const { DEFAULT_MODEL } = require('../config');

const router = express.Router();

async function getUserSettings(userId) {
  if (userId) {
    const { UserSettings } = getModels();
    const s = await UserSettings.findByPk(userId, { raw: true });
    return {
      systemPrompt: s?.system_prompt ?? '',
      suffix: s?.suffix ?? '',
      model: s?.model ?? '',
      reasoningEffort: s?.reasoning_effort ?? null
    };
  }
  return { systemPrompt: '', suffix: '', model: '', reasoningEffort: null };
}

// Translate the OpenAI sampling params we accept into Ollama's native `options`.
function toNativeOptions(params) {
  const opts = {};
  if (params.temperature !== undefined) opts.temperature = params.temperature;
  if (params.top_p !== undefined) opts.top_p = params.top_p;
  if (params.top_k !== undefined) opts.top_k = params.top_k;
  if (params.max_tokens !== undefined) opts.num_predict = params.max_tokens;
  if (params.max_completion_tokens !== undefined) opts.num_predict = params.max_completion_tokens;
  if (params.stop !== undefined) opts.stop = params.stop;
  if (params.seed !== undefined) opts.seed = params.seed;
  if (params.frequency_penalty !== undefined) opts.frequency_penalty = params.frequency_penalty;
  if (params.presence_penalty !== undefined) opts.presence_penalty = params.presence_penalty;
  return opts;
}

router.get('/models', optionalAuthMiddleware, async (req, res) => {
  try {
    const models = await listModels();
    res.json({
      object: 'list',
      data: models.map(m => ({
        id: m.id,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: m.is_cloud ? 'ollama-cloud' : 'ollama'
      }))
    });
  } catch (e) {
    res.status(500).json({ error: { message: e.message, type: 'server_error' } });
  }
});

router.post('/chat/completions', optionalAuthMiddleware, async (req, res) => {
  const { messages, model, stream = false, reasoning_effort, ...otherParams } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'messages required', type: 'invalid_request_error' } });
  }

  const settings = await getUserSettings(req.user?.id);
  const apiMessages = buildApiMessages(messages, settings.systemPrompt, settings.suffix);
  const requestModel = model || settings.model || DEFAULT_MODEL;
  const client = getOllamaClient();

  const think = await resolveThink(reasoning_effort ?? settings.reasoningEffort, requestModel);
  const options = toNativeOptions(otherParams);
  const chatRequest = {
    model: requestModel,
    messages: apiMessages,
    ...(think !== undefined ? { think } : {}),
    ...(Object.keys(options).length ? { options } : {})
  };

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResponse = await client.chat({ ...chatRequest, stream: true });

      const completionId = `chatcmpl-${crypto.randomBytes(12).toString('hex')}`;
      const created = Math.floor(Date.now() / 1000);

      for await (const part of streamResponse) {
        const msg = part.message || {};
        const delta = {};
        // Surface native reasoning as the non-standard `reasoning` delta field,
        // matching how Ollama's own OpenAI-compat layer exposes it.
        if (msg.thinking) delta.reasoning = msg.thinking;
        if (msg.content) delta.content = msg.content;
        const finishReason = part.done ? (part.done_reason || 'stop') : null;

        if (Object.keys(delta).length || finishReason) {
          res.write(`data: ${JSON.stringify({
            id: completionId,
            object: 'chat.completion.chunk',
            created,
            model: requestModel,
            choices: [{ index: 0, delta, finish_reason: finishReason }]
          })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const completion = await client.chat({ ...chatRequest, stream: false });
      const msg = completion.message || {};

      res.json({
        id: `chatcmpl-${crypto.randomBytes(12).toString('hex')}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestModel,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: msg.content || '',
            ...(msg.thinking ? { reasoning: msg.thinking } : {})
          },
          finish_reason: completion.done_reason || 'stop'
        }],
        usage: {
          prompt_tokens: completion.prompt_eval_count ?? 0,
          completion_tokens: completion.eval_count ?? 0,
          total_tokens: (completion.prompt_eval_count ?? 0) + (completion.eval_count ?? 0)
        }
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
