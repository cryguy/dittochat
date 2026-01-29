const express = require('express');
const { getModels } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/import - Import a chat from parsed markdown data
router.post('/', authMiddleware, async (req, res) => {
  const { id, title, messages, model, preset } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Chat ID required' });
  }

  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages required' });
  }

  try {
    const { Chat, Message } = getModels();
    const now = Math.floor(Date.now() / 1000);

    // Create the chat
    await Chat.create({
      id,
      user_id: req.user.id,
      title,
      created_at: now,
      updated_at: now
    });

    // Insert all messages
    const messageRecords = messages.map(msg => {
      const role = msg.role || 'user';
      const content = msg.content !== undefined ? msg.content : '';
      const msgModel = role === 'assistant' ? (model || null) : null;
      const msgPreset = role === 'assistant' ? (preset || null) : null;
      return { chat_id: id, role, content, model: msgModel, preset: msgPreset };
    });

    await Message.bulkCreate(messageRecords);

    res.json({
      id,
      title,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error('[Import] Error:', error);
    res.status(500).json({ error: 'Failed to import chat' });
  }
});

module.exports = router;
