const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductPricingRule = sequelize.define('ProductPricingRule', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: true
  },
  ProductId: {
    type: DataTypes.CHAR(36),
    allowNull: false
  },
  customer_type: {
    type: DataTypes.ENUM('retail', 'wholesale'),
    allowNull: false
  },
  min_quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  rule_type: {
    type: DataTypes.ENUM('FIXED_PRICE', 'DISCOUNT_PERCENT', 'DISCOUNT_AMOUNT'),
    defaultValue: 'FIXED_PRICE'
  },
  rule_value: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Legacy fields retained for data safety
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  tax_type: {
    type: DataTypes.ENUM('TVA', 'NTVA'),
    defaultValue: 'NTVA'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ProductPricingRules',
  timestamps: true,
  updatedAt: false
});

module.exports = ProductPricingRule;
