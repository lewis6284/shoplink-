const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  idempotency_key: {
    type: DataTypes.CHAR(36),
    unique: true
  },
  status: {
    type: DataTypes.ENUM('COMPLETED', 'CANCELLED'),
    defaultValue: 'COMPLETED'
  },
  paymentMethod: {
    type: DataTypes.ENUM('CASH', 'MOBILE_MONEY', 'CREDIT'),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  tax_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  tax_type: {
    type: DataTypes.ENUM('TVA', 'NTVA'),
    defaultValue: 'NTVA'
  },
  UserId: {
    type: DataTypes.CHAR(36)
  },
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: false
  },
  CashSessionId: {
    type: DataTypes.CHAR(36),
    allowNull: true
  },
  CustomerId: {
    type: DataTypes.CHAR(36)
  }
}, {
  tableName: 'Sales',
  timestamps: true
});

module.exports = Sale;
