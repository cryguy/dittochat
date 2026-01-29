const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InviteCode = sequelize.define('InviteCode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    max_uses: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    uses: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    expires_at: {
      type: DataTypes.INTEGER,
      defaultValue: null
    },
    created_at: {
      type: DataTypes.INTEGER,
      defaultValue: () => Math.floor(Date.now() / 1000)
    }
  }, {
    tableName: 'invite_codes',
    timestamps: false
  });

  return InviteCode;
};
