const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GlobalPrompt = sequelize.define('GlobalPrompt', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
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
    tableName: 'global_prompts',
    timestamps: false
  });

  return GlobalPrompt;
};
