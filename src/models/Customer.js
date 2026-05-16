const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: true   // null = global customer not tied to a shop
  },
  full_name: {
    type: DataTypes.STRING(255)
  },
  phone: {
    type: DataTypes.STRING(50)
  },
  email: {
    type: DataTypes.STRING(150)
  },
  address: {
    type: DataTypes.TEXT
  },
  loyalty_points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  credit_balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  total_spent: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  type: {
    type: DataTypes.ENUM('normal', 'partner'),
    defaultValue: 'normal'
  },
  customer_type: {
    type: DataTypes.ENUM('retail', 'partner', 'wholesale'),
    defaultValue: 'retail'
  }
}, {
  tableName: 'customers'
});

module.exports = Customer;
