const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  shop_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  shop_phone: {
    type: DataTypes.STRING(50)
  },
  shop_email: {
    type: DataTypes.STRING(150)
  },
  shop_address: {
    type: DataTypes.TEXT
  },
  currency: {
    type: DataTypes.STRING(20),
    defaultValue: 'FBU'
  },
  tax_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  receipt_footer: {
    type: DataTypes.TEXT
  },
  logo_url: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'settings'
});

module.exports = Setting;
