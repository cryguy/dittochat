const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomPrompt = sequelize.define('CustomPrompt', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    system_prompt: {
      type: DataTypes.TEXT
    },
    suffix: {
      type: DataTypes.TEXT
    },
    created_at: {
      type: DataTypes.INTEGER,
      defaultValue: () => Math.floor(Date.now() / 1000)
    }
  }, {
    tableName: 'custom_prompts',
    timestamps: false
  });

  return CustomPrompt;
};
