const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('UserSettings', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    system_prompt: {
      type: DataTypes.TEXT
    },
    suffix: {
      type: DataTypes.TEXT
    },
    model: {
      type: DataTypes.TEXT
    },
    naming_model: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    // 'off' | 'low' | 'medium' | 'high' | null. null keeps thinking on for
    // thinking-capable models (preserves prior behavior).
    reasoning_effort: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    backend_url: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    api_key: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    active_prompt_id: {
      type: DataTypes.INTEGER,
      defaultValue: null
    },
    active_prompt_is_global: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'user_settings',
    timestamps: false
  });
};
