const express = require('express');
const { getDb, saveDatabase } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/import - Import a chat from parsed markdown data
router.post('/', authMiddleware, (req, res) => {
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

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  try {
    // Create the chat
    db.run(
      'INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.id, title, now, now]
    );

    // Insert all messages
    for (const msg of messages) {
      const role = msg.role || 'user';
      const content = msg.content !== undefined ? msg.content : '';
      // Use provided model/preset for assistant messages, null for user messages
      const msgModel = role === 'assistant' ? (model || null) : null;
      const msgPreset = role === 'assistant' ? (preset || null) : null;

      db.run(
        'INSERT INTO messages (chat_id, role, content, model, preset) VALUES (?, ?, ?, ?, ?)',
        [id, role, content, msgModel, msgPreset]
      );
    }

    saveDatabase();

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
