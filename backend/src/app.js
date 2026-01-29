const express = require('express');
const path = require('path');
const { promptList } = require('./config');
const {
  authRoutes,
  chatsRoutes,
  settingsRoutes,
  promptsRoutes,
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
app.use('/api/models', modelsRoutes);
app.get('/api/config', (req, res) => {
  const defaultPrompt = promptList[0] || {};
  res.json({
    system_prompt: defaultPrompt.system_prompt || '',
    suffix: defaultPrompt.suffix || ''
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
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/v1/')) return next();
    res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html'));
  });
}

module.exports = { app, setupStaticFiles };
