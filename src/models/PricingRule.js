const { DataTypes } = require('sequelize');
const { sequelize } = require('../../db');

const PricingRule = sequelize.define('PricingRule', {
  id: {
    type: DataTypes.UUID,
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
    type: DataTypes.UUID,
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
