const express = require('express');
const path = require('path');
const { getSea } = require('./db');
const { prompts } = require('./config');
const {
  authRoutes,
  chatsRoutes,
  settingsRoutes,
  promptsRoutes,
  modelPromptsRoutes,
  modelsRoutes,
  chatRoutes,
  openaiRoutes,
  importRoutes,
  adminRoutes
} = require('./routes');

const app = express();
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/model-prompts', modelPromptsRoutes);
app.use('/api/models', modelsRoutes);
app.get('/api/config', (req, res) => {
  res.json({
    system_prompt: prompts.system_prompt || '',
    suffix: prompts.suffix_thinking || ''
  });
});
app.use('/api/chat', chatRoutes);
app.use('/api/import', importRoutes);
app.use('/api/admin', adminRoutes);

// OpenAI Compatible API
app.use('/v1', openaiRoutes);

// Error handling middleware - hide stack traces and directory paths
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);

  // Handle specific error types
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload too large' });
  }

  // Generic error response - don't expose internal details
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// Static Files & SPA Fallback
function setupStaticFiles() {
  const sea = getSea();

  if (sea) {
    // Serve assets from SEA blob
    app.get('/assets/*', (req, res) => {
      const assetPath = req.path.slice(1); // Remove leading /
      try {
        const content = sea.getAsset(assetPath, 'utf8');
        if (assetPath.endsWith('.js')) {
          res.type('application/javascript');
        } else if (assetPath.endsWith('.css')) {
          res.type('text/css');
        }
        res.send(content);
      } catch {
        res.status(404).send('Not found');
      }
    });

    // SPA fallback - serve index.html for all other routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/v1/')) return next();
      res.type('text/html').send(sea.getAsset('index.html', 'utf8'));
    });
  } else {
    app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/v1/')) return next();
      res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html'));
    });
  }
}

module.exports = { app, setupStaticFiles };
