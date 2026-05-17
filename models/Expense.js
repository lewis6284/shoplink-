const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
  ,
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: true
  },
  UserId: {
    type: DataTypes.CHAR(36),
    allowNull: true
  }
}, {
  tableName: 'Expenses',
  timestamps: true
});

module.exports = Expense;
