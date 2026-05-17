const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PricingRule = sequelize.define('PricingRule', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customer_type: {
    type: DataTypes.ENUM('retail', 'partner', 'wholesale'),
    defaultValue: 'retail'
  },
  CategoryId: {
    type: DataTypes.CHAR(36),
    allowNull: true // If null, applies to all categories
  },
  min_quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  fixed_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 1 // Higher priority wins
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, { timestamps: true });

module.exports = PricingRule;
