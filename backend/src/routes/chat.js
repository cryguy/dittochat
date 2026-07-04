const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { createOllamaClient, getOllamaClient, resolveThink } = require('../services/ollama');
const { DEFAULT_MODEL } = require('../config');
const { buildApiMessages } = require('../utils/messages');
const { initStream, appendChunk, markDone, getStream, abortStream } = require('../services/streamBuffer');
const { getModels } = require('../db');

const router = express.Router();

router.post('/stream', authMiddleware, async (req, res) => {
  const { chatId, messages, model, systemPrompt, suffix, preset } = req.body;
  console.log('[Chat Stream] POST /stream received, chatId:', chatId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Track if stream should stop (only via explicit abort)
  let shouldStop = false;

  // Fresh client per request so aborting this stream doesn't cancel others.
  const streamClient = createOllamaClient();
  const titleClient = getOllamaClient();
  const userId = req.user.id;

  // Initialize stream buffer if chatId provided
  let streamData = null;
  if (chatId) {
    initStream(chatId);
    streamData = getStream(chatId);
    // Listen for abort signal
    if (streamData) {
      streamData.emitter.once('abort', () => {
        shouldStop = true;
        console.log(`[Chat Stream] Abort signal received for chat ${chatId}`);
        try { streamClient.abort(); } catch (e) { /* no in-flight request */ }
      });
    }
    // Send streamId in first chunk so frontend knows which stream this is
    res.write(`data: ${JSON.stringify({ streamId: chatId })}\n\n`);
  }

  const saveToDb = async () => {
    if (!chatId) return;
    const streamData = getStream(chatId);
    if (streamData && streamData.content) {
      try {
        const { Message, Chat } = getModels();
        await Message.create({
          chat_id: chatId,
          role: 'assistant',
          content: streamData.content,
          model: model || null,
          preset: preset || null
        });
        await Chat.update(
          { updated_at: Math.floor(Date.now() / 1000) },
          { where: { id: chatId } }
        );
        console.log(`[Chat Stream] Saved assistant message to DB for chat ${chatId} (${streamData.content.length} chars)`);
      } catch (e) {
        console.error(`[Chat Stream] Error saving to DB:`, e.message);
      }
    }
    markDone(chatId);

    // Generate title asynchronously (fire and forget) for first exchange
    try {
      const { Chat, Message } = getModels();
      const chat = await Chat.findByPk(chatId, { attributes: ['title'], raw: true });
      if (chat && chat.title === 'New Chat') {
        const msgCount = await Message.count({ where: { chat_id: chatId } });
        if (msgCount === 2) {
          generateTitle(chatId, userId, titleClient).catch(e =>
            console.log(`[Chat Stream] Title generation failed:`, e.message)
          );
        }
      }
    } catch (e) {
      console.log(`[Chat Stream] Error checking title:`, e.message);
    }
  };

  async function generateTitle(chatId, userId, client) {
    try {
      const { UserSettings, Message, Chat } = getModels();
      const settings = await UserSettings.findByPk(userId, { raw: true });
      const namingModel = settings?.naming_model;

      if (!namingModel || namingModel === 'disabled') {
        const now = new Date();
        const title = `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        await Chat.update({ title }, { where: { id: chatId } });
        console.log(`[Chat Stream] Generated date title for chat ${chatId}: ${title}`);
        return;
      }

      const msgs = await Message.findAll({
        where: { chat_id: chatId },
        attributes: ['role', 'content'],
        order: [['created_at', 'ASC']],
        raw: true
      });
      const userMessages = msgs.filter(m => m.role === 'user').slice(0, 2);
      const context = userMessages.map(m => m.content).join('\n').slice(0, 500);

      const completion = await client.chat({
        model: namingModel,
        messages: [
          { role: 'system', content: 'Generate a very short title (3-6 words max). Return ONLY the title, no quotes.' },
          { role: 'user', content: context }
        ],
        stream: false,
        think: false,
        options: { num_predict: 20, temperature: 0.7 }
      });

      let title = completion.message?.content?.trim() || 'New Chat';
      title = title.replace(/^["']|["']$/g, '').replace(/\.+$/, '').slice(0, 50);
      await Chat.update({ title }, { where: { id: chatId } });
      console.log(`[Chat Stream] Generated AI title for chat ${chatId}: ${title}`);
    } catch (e) {
      console.log(`[Chat Stream] Title generation failed for chat ${chatId}:`, e.message);
      const now = new Date();
      const title = `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const { Chat } = getModels();
      await Chat.update({ title }, { where: { id: chatId } });
    }
  }

  const requestModel = model || DEFAULT_MODEL;
  let inThinking = false;

  try {
    const { UserSettings } = getModels();
    const userSettings = await UserSettings.findByPk(userId, { raw: true });
    const think = await resolveThink(userSettings?.reasoning_effort, requestModel);

    const apiMessages = buildApiMessages(messages, systemPrompt, suffix);
    const stream = await streamClient.chat({
      model: requestModel,
      messages: apiMessages,
      stream: true,
      ...(think !== undefined ? { think } : {})
    });

    for await (const part of stream) {
      // Stop processing if aborted
      if (shouldStop) break;

      const message = part.message || {};
      const thinking = message.thinking || '';
      const content = message.content || '';

      // Ollama's native /api/chat emits reasoning as a separate `thinking` field.
      // Wrap it in <thinking>...</thinking> inline so the existing frontend parser
      // and ThinkingBlock render it without any frontend changes.
      let out = '';
      if (thinking) {
        if (!inThinking) { out += '<thinking>'; inThinking = true; }
        out += thinking;
      }
      if (content) {
        if (inThinking) { out += '</thinking>'; inThinking = false; }
        out += content;
      }

      if (out) {
        if (chatId) appendChunk(chatId, out);
        res.write(`data: ${JSON.stringify({ content: out })}\n\n`);
      }
    }
  } catch (e) {
    // streamClient.abort() surfaces here too; only log genuine upstream errors.
    if (!shouldStop) console.log(`[Chat Stream] Error for chat ${chatId}:`, e.message);
  }

  // Close any unclosed thinking block so saved/streamed content stays valid
  // (both on normal end and mid-stream abort).
  if (inThinking) {
    const closer = '</thinking>';
    if (chatId) appendChunk(chatId, closer);
    if (!res.writableEnded) res.write(`data: ${JSON.stringify({ content: closer })}\n\n`);
    inThinking = false;
  }

  await saveToDb();

  if (!res.writableEnded) {
    if (!shouldStop) res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Abort a stream
router.post('/stream/abort', authMiddleware, (req, res) => {
  const { chatId } = req.body;
  console.log(`[Chat Stream] Abort request for chat ${chatId}`);

  if (!chatId) {
    return res.status(400).json({ error: 'chatId required' });
  }

  const aborted = abortStream(chatId);
  res.json({ success: aborted });
});

module.exports = router;
