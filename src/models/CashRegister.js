const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CashRegister = sequelize.define('CashRegister', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Main Register'
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('open', 'closed'),
    defaultValue: 'open'
  },
  ShopId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'CashRegisters'
});

module.exports = CashRegister;
