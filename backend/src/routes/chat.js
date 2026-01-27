const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getOpenAIClient } = require('../services/openai');
const { buildApiMessages } = require('../utils/messages');
const { initStream, appendChunk, markDone, getStream, abortStream } = require('../services/streamBuffer');
const { getDb, dbGet, dbAll, saveDatabase } = require('../db');

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

  const saveToDb = () => {
    if (!chatId) return;
    const streamData = getStream(chatId);
    if (streamData && streamData.content) {
      const db = getDb();
      db.run(
        'INSERT INTO messages (chat_id, role, content, model, preset) VALUES (?, ?, ?, ?, ?)',
        [chatId, 'assistant', streamData.content, model || null, preset || null]
      );
      db.run(
        'UPDATE chats SET updated_at = ? WHERE id = ?',
        [Math.floor(Date.now() / 1000), chatId]
      );
      saveDatabase();
      console.log(`[Chat Stream] Saved assistant message to DB for chat ${chatId} (${streamData.content.length} chars)`);
    }
    markDone(chatId);

    // Generate title asynchronously (fire and forget) for first exchange
    const chat = dbGet('SELECT title FROM chats WHERE id = ?', [chatId]);
    if (chat && chat.title === 'New Chat') {
      const msgCount = dbGet('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?', [chatId]);
      if (msgCount && msgCount.count === 2) {
        generateTitle(chatId, userId, client).catch(e =>
          console.log(`[Chat Stream] Title generation failed:`, e.message)
        );
      }
    }
  };

  async function generateTitle(chatId, userId, client) {
    try {
      const settings = dbGet('SELECT naming_model FROM user_settings WHERE user_id = ?', [userId]);
      const namingModel = settings?.naming_model;
      const db = getDb();

      if (!namingModel || namingModel === 'disabled') {
        const now = new Date();
        const title = `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        db.run('UPDATE chats SET title = ? WHERE id = ?', [title, chatId]);
        saveDatabase();
        console.log(`[Chat Stream] Generated date title for chat ${chatId}: ${title}`);
        return;
      }

      const messages = dbAll('SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at', [chatId]);
      const userMessages = messages.filter(m => m.role === 'user').slice(0, 2);
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
      db.run('UPDATE chats SET title = ? WHERE id = ?', [title, chatId]);
      saveDatabase();
      console.log(`[Chat Stream] Generated AI title for chat ${chatId}: ${title}`);
    } catch (e) {
      console.log(`[Chat Stream] Title generation failed for chat ${chatId}:`, e.message);
      const now = new Date();
      const title = `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const db = getDb();
      db.run('UPDATE chats SET title = ? WHERE id = ?', [title, chatId]);
      saveDatabase();
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
        saveToDb();
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
    saveToDb();

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
