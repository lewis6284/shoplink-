const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  SaleId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  ShopId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  UserId: {
    type: DataTypes.UUID,
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
