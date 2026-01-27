const express = require('express');
const { dbGet, dbAll, dbRun, getDb, saveDatabase } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { getOpenAIClient } = require('../services/openai');
const { getStream } = require('../services/streamBuffer');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const chats = dbAll('SELECT id, title, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC', [req.user.id]);
  res.json(chats);
});

router.post('/', authMiddleware, (req, res) => {
  const { id, title } = req.body;
  if (!id) return res.status(400).json({ error: 'Chat ID required' });
  dbRun('INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)', [id, req.user.id, title || 'New Chat']);
  res.json({ id, title: title || 'New Chat' });
});

router.get('/:id', authMiddleware, (req, res) => {
  const chat = dbGet('SELECT * FROM chats WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  const messages = dbAll('SELECT role, content, model, preset FROM messages WHERE chat_id = ? ORDER BY created_at', [req.params.id]);
  res.json({ ...chat, messages });
});

// Resume an active stream for this chat
router.get('/:id/stream', authMiddleware, (req, res) => {
  const chatId = req.params.id;
  const stream = getStream(chatId);

  // No active stream or already done - return 204
  // (done streams are already saved to DB, frontend will get from messages)
  if (!stream || stream.done) {
    return res.status(204).end();
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send buffered content first
  if (stream.content) {
    res.write(`data: ${JSON.stringify({ content: stream.content })}\n\n`);
  }

  // Subscribe to new chunks
  const onChunk = (content) => {
    res.write(`data: ${JSON.stringify({ content })}\n\n`);
  };

  const onDone = () => {
    res.write('data: [DONE]\n\n');
    res.end();
  };

  stream.emitter.on('chunk', onChunk);
  stream.emitter.once('done', onDone);

  // Cleanup on client disconnect
  req.on('close', () => {
    stream.emitter.off('chunk', onChunk);
    stream.emitter.off('done', onDone);
  });
});

router.put('/:id', authMiddleware, (req, res) => {
  const { title, messages } = req.body;
  console.log('[Chats] PUT /:id', req.params.id);
  console.log('[Chats] title:', title, 'typeof:', typeof title);
  console.log('[Chats] messages:', messages?.length, 'first msg:', messages?.[0]);
  const chat = dbGet('SELECT * FROM chats WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  if (title) db.run('UPDATE chats SET title = ?, updated_at = ? WHERE id = ?', [title, now, req.params.id]);
  if (messages) {
    db.run('DELETE FROM messages WHERE chat_id = ?', [req.params.id]);
    for (const msg of messages) {
      // Ensure no undefined values are passed to better-sqlite3
      const role = msg.role || 'user';
      const content = msg.content !== undefined ? msg.content : '';
      const model = msg.model !== undefined ? msg.model : null;
      const preset = msg.preset !== undefined ? msg.preset : null;
      console.log('[Chats] INSERT message:', { role, contentLen: content.length, model, preset });
      db.run('INSERT INTO messages (chat_id, role, content, model, preset) VALUES (?, ?, ?, ?, ?)', [req.params.id, role, content, model, preset]);
    }
    db.run('UPDATE chats SET updated_at = ? WHERE id = ?', [now, req.params.id]);
  }
  saveDatabase();
  res.json({ success: true });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const chat = dbGet('SELECT id FROM chats WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  const db = getDb();
  db.run('DELETE FROM messages WHERE chat_id = ?', [req.params.id]);
  db.run('DELETE FROM chats WHERE id = ?', [req.params.id]);
  saveDatabase();
  res.json({ success: true });
});

router.post('/:id/generate-title', authMiddleware, async (req, res) => {
  const { messages } = req.body;
  const chat = dbGet('SELECT * FROM chats WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const settings = dbGet('SELECT naming_model FROM user_settings WHERE user_id = ?', [req.user.id]);
  const namingModel = settings?.naming_model;

  if (!namingModel || namingModel === 'disabled') {
    const now = new Date();
    const title = `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const db = getDb();
    db.run('UPDATE chats SET title = ?, updated_at = ? WHERE id = ?', [title, Math.floor(Date.now() / 1000), req.params.id]);
    saveDatabase();
    return res.json({ title });
  }

  try {
    const client = getOpenAIClient();
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
    const db = getDb();
    db.run('UPDATE chats SET title = ?, updated_at = ? WHERE id = ?', [title, Math.floor(Date.now() / 1000), req.params.id]);
    saveDatabase();
    res.json({ title });
  } catch (e) {
    const now = new Date();
    const title = `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const db = getDb();
    db.run('UPDATE chats SET title = ?, updated_at = ? WHERE id = ?', [title, Math.floor(Date.now() / 1000), req.params.id]);
    saveDatabase();
    res.json({ title });
  }
});

module.exports = router;
