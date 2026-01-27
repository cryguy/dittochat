const authRoutes = require('./auth');
const chatsRoutes = require('./chats');
const settingsRoutes = require('./settings');
const promptsRoutes = require('./prompts');
const modelPromptsRoutes = require('./modelPrompts');
const modelsRoutes = require('./models');
const chatRoutes = require('./chat');
const openaiRoutes = require('./openai');

module.exports = {
  authRoutes,
  chatsRoutes,
  settingsRoutes,
  promptsRoutes,
  modelPromptsRoutes,
  modelsRoutes,
  chatRoutes,
  openaiRoutes
};
