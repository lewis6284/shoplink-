const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  SaleId: {
    type: DataTypes.CHAR(36),
    allowNull: false
  },
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: false
  },
  UserId: {
    type: DataTypes.CHAR(36),
    allowNull: false
  },
  invoice_number: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  tax_type: {
    type: DataTypes.ENUM('TVA', 'NTVA'),
    defaultValue: 'NTVA'
  },
  tax_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('GENERATED', 'PRINTED', 'SENT'),
    defaultValue: 'GENERATED'
  }
}, {
  tableName: 'Invoices',
  timestamps: true
});

module.exports = Invoice;
