const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  idempotency_key: {
    type: DataTypes.UUID,
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
    type: DataTypes.UUID
  },
  ShopId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  CashSessionId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  CustomerId: {
    type: DataTypes.UUID
  }
}, {
  tableName: 'Sales',
  timestamps: true
});

module.exports = Sale;
