const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanySetting = sequelize.define('CompanySetting', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  nif: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  rc: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  stamp_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'company_settings'
});

module.exports = CompanySetting;
