const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Session = sequelize.define('Session', {
    token: {
      type: DataTypes.TEXT,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    created_at: {
      type: DataTypes.INTEGER,
      defaultValue: () => Math.floor(Date.now() / 1000)
    },
    expires_at: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'sessions',
    timestamps: false
  });

  return Session;
};
