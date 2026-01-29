const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getOpenAIClient } = require('../services/openai');
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
      });
    }
    // Send streamId in first chunk so frontend knows which stream this is
    res.write(`data: ${JSON.stringify({ streamId: chatId })}\n\n`);
  }

  const client = getOpenAIClient();
  const userId = req.user.id;

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
          generateTitle(chatId, userId, client).catch(e =>
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

      const completion = await client.chat.completions.create({
        model: namingModel,
        messages: [
          { role: 'system', content: 'Generate a very short title (3-6 words max). Return ONLY the title, no quotes.' },
          { role: 'user', content: context }
        ],
        max_tokens: 20,
        temperature: 0.7
      });

      let title = completion.choices[0]?.message?.content?.trim() || 'New Chat';
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

  try {
    const apiMessages = buildApiMessages(messages, systemPrompt, suffix);
    const stream = await client.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: apiMessages,
      stream: true
    });

    for await (const chunk of stream) {
      // Stop processing if aborted or client disconnected
      if (shouldStop) {
        console.log(`[Chat Stream] Stopping stream processing for chat ${chatId}`);
        // Save partial content and mark done
        await saveToDb();
        return;
      }

      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // Buffer chunk if chatId provided
        if (chatId) {
          appendChunk(chatId, content);
        }
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Stream completed normally - save to DB
    await saveToDb();

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    console.log(`[Chat Stream] Error for chat ${chatId}:`, e.message);
    // Ignore errors - stream continues to save on abort or will complete normally
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
