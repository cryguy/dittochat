const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('GlobalPrompt', {
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
    description: {
      type: DataTypes.TEXT,
      defaultValue: ''
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
};
