const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    chat_id: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    role: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    model: {
      type: DataTypes.TEXT
    },
    preset: {
      type: DataTypes.TEXT
    },
    created_at: {
      type: DataTypes.INTEGER,
      defaultValue: () => Math.floor(Date.now() / 1000)
    }
  }, {
    tableName: 'messages',
    timestamps: false
  });

  return Message;
};
