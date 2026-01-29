const { Sequelize, Op } = require('sequelize');
const { DB_PATH } = require('../config');

let sequelize;
let models = {};

async function initDatabase() {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: DB_PATH,
    logging: false
  });

  // Load models
  models.User = require('./models/User')(sequelize);
  models.Session = require('./models/Session')(sequelize);
  models.Chat = require('./models/Chat')(sequelize);
  models.Message = require('./models/Message')(sequelize);
  models.UserSettings = require('./models/UserSettings')(sequelize);
  models.CustomPrompt = require('./models/CustomPrompt')(sequelize);
  models.ModelPromptSetting = require('./models/ModelPromptSetting')(sequelize);
  models.GlobalPrompt = require('./models/GlobalPrompt')(sequelize);
  models.AppSetting = require('./models/AppSetting')(sequelize);
  models.InviteCode = require('./models/InviteCode')(sequelize);

  // Define associations
  models.User.hasMany(models.Session, { foreignKey: 'user_id', onDelete: 'CASCADE' });
  models.Session.belongsTo(models.User, { foreignKey: 'user_id' });

  models.User.hasMany(models.Chat, { foreignKey: 'user_id', onDelete: 'CASCADE' });
  models.Chat.belongsTo(models.User, { foreignKey: 'user_id' });

  models.Chat.hasMany(models.Message, { foreignKey: 'chat_id', onDelete: 'CASCADE' });
  models.Message.belongsTo(models.Chat, { foreignKey: 'chat_id' });

  models.User.hasOne(models.UserSettings, { foreignKey: 'user_id', onDelete: 'CASCADE' });
  models.UserSettings.belongsTo(models.User, { foreignKey: 'user_id' });

  models.User.hasMany(models.CustomPrompt, { foreignKey: 'user_id', onDelete: 'CASCADE' });
  models.CustomPrompt.belongsTo(models.User, { foreignKey: 'user_id' });

  models.User.hasMany(models.ModelPromptSetting, { foreignKey: 'user_id', onDelete: 'CASCADE' });
  models.ModelPromptSetting.belongsTo(models.User, { foreignKey: 'user_id' });

  models.User.hasMany(models.InviteCode, { foreignKey: 'created_by', onDelete: 'CASCADE' });
  models.InviteCode.belongsTo(models.User, { foreignKey: 'created_by' });

  // Sync schema - creates missing tables only (safe for existing databases)
  // Disable foreign keys during sync to avoid constraint issues with existing data
  await sequelize.query('PRAGMA foreign_keys = OFF;');
  await sequelize.sync();
  await sequelize.query('PRAGMA foreign_keys = ON;');

  // Seed default app settings
  await models.AppSetting.findOrCreate({
    where: { key: 'registration_enabled' },
    defaults: { key: 'registration_enabled', value: 'true' }
  });
  await models.AppSetting.findOrCreate({
    where: { key: 'invite_only' },
    defaults: { key: 'invite_only', value: 'false' }
  });

  // Seed global prompts from prompt.json
  const { promptList } = require('../config');
  for (const p of promptList) {
    await models.GlobalPrompt.findOrCreate({
      where: { name: p.name },
      defaults: {
        name: p.name,
        description: p.description || '',
        system_prompt: p.system_prompt || '',
        suffix: p.suffix || ''
      }
    });
  }

  // Ensure first user is admin (migration compat)
  const firstUser = await models.User.findOne({ order: [['id', 'ASC']] });
  if (firstUser && !firstUser.is_admin) {
    const adminCount = await models.User.count({ where: { is_admin: 1 } });
    if (adminCount === 0) {
      await firstUser.update({ is_admin: 1 });
    }
  }
}

function startSessionCleanup() {
  setInterval(async () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      await models.Session.destroy({ where: { expires_at: { [Op.lt]: now } } });
    } catch (e) {
      console.error('[Session Cleanup] Error:', e.message);
    }
  }, 60 * 60 * 1000);
}

async function closeDatabase() {
  if (sequelize) {
    await sequelize.close();
  }
}

function getModels() {
  return models;
}

function getSequelize() {
  return sequelize;
}

module.exports = {
  initDatabase,
  startSessionCleanup,
  closeDatabase,
  getModels,
  getSequelize,
  Op
};
