const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AppSetting = sequelize.define('AppSetting', {
    key: {
      type: DataTypes.TEXT,
      primaryKey: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'app_settings',
    timestamps: false
  });

  return AppSetting;
};
