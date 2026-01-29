const express = require('express');
const { getModels } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { getOpenAIClient } = require('../services/openai');
const { getStream } = require('../services/streamBuffer');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { Chat } = getModels();
    const chats = await Chat.findAll({
      where: { user_id: req.user.id },
      attributes: ['id', 'title', 'created_at', 'updated_at'],
      order: [['updated_at', 'DESC']],
      raw: true
    });
    res.json(chats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { id, title } = req.body;
  if (!id) return res.status(400).json({ error: 'Chat ID required' });

  try {
    const { Chat } = getModels();
    await Chat.create({ id, user_id: req.user.id, title: title || 'New Chat' });
    res.json({ id, title: title || 'New Chat' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { Chat, Message } = getModels();
    const chat = await Chat.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      raw: true
    });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const messages = await Message.findAll({
      where: { chat_id: req.params.id },
      attributes: ['role', 'content', 'model', 'preset'],
      order: [['created_at', 'ASC']],
      raw: true
    });
    res.json({ ...chat, messages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Resume an active stream for this chat
router.get('/:id/stream', authMiddleware, (req, res) => {
  const chatId = req.params.id;
  const stream = getStream(chatId);

  // No active stream or already done - return 204
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

router.put('/:id', authMiddleware, async (req, res) => {
  const { title, messages } = req.body;

  try {
    const { Chat, Message } = getModels();
    const chat = await Chat.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const now = Math.floor(Date.now() / 1000);
    if (title) {
      await chat.update({ title, updated_at: now });
    }
    if (messages) {
      await Message.destroy({ where: { chat_id: req.params.id } });
      const messageRecords = messages.map(msg => ({
        chat_id: req.params.id,
        role: msg.role || 'user',
        content: msg.content !== undefined ? msg.content : '',
        model: msg.model !== undefined ? msg.model : null,
        preset: msg.preset !== undefined ? msg.preset : null
      }));
      await Message.bulkCreate(messageRecords);
      await chat.update({ updated_at: now });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { Chat, Message } = getModels();
    const chat = await Chat.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    await Message.destroy({ where: { chat_id: req.params.id } });
    await chat.destroy();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/generate-title', authMiddleware, async (req, res) => {
  const { messages } = req.body;

  try {
    const { Chat, UserSettings } = getModels();
    const chat = await Chat.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const settings = await UserSettings.findByPk(req.user.id, { raw: true });
    const namingModel = settings?.naming_model;

    if (!namingModel || namingModel === 'disabled') {
      const now = new Date();
      const title = `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      await chat.update({ title, updated_at: Math.floor(Date.now() / 1000) });
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
      await chat.update({ title, updated_at: Math.floor(Date.now() / 1000) });
      res.json({ title });
    } catch (e) {
      const now = new Date();
      const title = `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      await chat.update({ title, updated_at: Math.floor(Date.now() / 1000) });
      res.json({ title });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
