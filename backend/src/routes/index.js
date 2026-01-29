const authRoutes = require('./auth');
const chatsRoutes = require('./chats');
const settingsRoutes = require('./settings');
const promptsRoutes = require('./prompts');
const modelsRoutes = require('./models');
const chatRoutes = require('./chat');
const openaiRoutes = require('./openai');
const importRoutes = require('./import');
const adminRoutes = require('./admin');

module.exports = {
  authRoutes,
  chatsRoutes,
  settingsRoutes,
  promptsRoutes,
  modelsRoutes,
  chatRoutes,
  openaiRoutes,
  importRoutes,
  adminRoutes
};
