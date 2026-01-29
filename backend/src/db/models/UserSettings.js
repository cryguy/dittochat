const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSettings = sequelize.define('UserSettings', {
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
    backend_url: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    api_key: {
      type: DataTypes.TEXT,
      defaultValue: null
    }
  }, {
    tableName: 'user_settings',
    timestamps: false
  });

  return UserSettings;
};
