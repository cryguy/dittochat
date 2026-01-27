const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getOpenAIClient } = require('../services/openai');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const client = getOpenAIClient();
    const models = await client.models.list();
    res.json(models.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
