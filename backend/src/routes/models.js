const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { listModels, getModelInfo } = require('../services/ollama');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const models = await listModels();
    res.json(models.map(m => ({
      id: m.id,
      object: 'model',
      owned_by: m.is_cloud ? 'ollama-cloud' : 'ollama',
      family: m.family,
      parameter_size: m.parameter_size,
      size: m.size,
      is_cloud: m.is_cloud
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Capabilities are fetched lazily (per model, cached) so the model list never
// triggers an /api/show fan-out across the whole catalog. Uses a query param
// because model ids can contain '/' (namespaced tags).
router.get('/capabilities', authMiddleware, async (req, res) => {
  const model = req.query.model;
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ error: 'model query param required' });
  }
  try {
    const info = await getModelInfo(model);
    res.json({ capabilities: info.capabilities, context_length: info.contextLength });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
