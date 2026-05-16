const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Product = require('./Product');
const User = require('./User');

const StockAdjustment = sequelize.define('StockAdjustment', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  product_id: {
    type: DataTypes.UUID,
    references: { model: Product, key: 'id' }
  },
  user_id: {
    type: DataTypes.UUID,
    references: { model: User, key: 'id' }
  },
  old_quantity: {
    type: DataTypes.DECIMAL(12, 2)
  },
  new_quantity: {
    type: DataTypes.DECIMAL(12, 2)
  },
  reason: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'stock_adjustments',
  updatedAt: false
});

StockAdjustment.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockAdjustment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Product.hasMany(StockAdjustment, { foreignKey: 'product_id' });
User.hasMany(StockAdjustment, { foreignKey: 'user_id' });

module.exports = StockAdjustment;
