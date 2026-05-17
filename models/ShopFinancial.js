const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ShopFinancial = sequelize.define('ShopFinancial', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    unique: true
  },
  total_sales: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_expenses: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  net_profit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_tva: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_ntva: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  }
}, {
  tableName: 'ShopFinancials',
  timestamps: true,
  createdAt: false
});

module.exports = ShopFinancial;
