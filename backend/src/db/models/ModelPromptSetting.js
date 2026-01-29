const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ModelPromptSetting = sequelize.define('ModelPromptSetting', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    model: {
      type: DataTypes.TEXT,
      primaryKey: true
    },
    prompt_id: {
      type: DataTypes.INTEGER
    },
    is_global: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'model_prompt_settings',
    timestamps: false
  });

  return ModelPromptSetting;
};
