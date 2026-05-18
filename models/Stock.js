const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Stock = sequelize.define('Stock', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: false
  },
  ProductId: {
    type: DataTypes.CHAR(36),
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  reserved_quantity: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  min_stock_level: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  }
}, {
  tableName: 'Stocks',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['ProductId', 'ShopId']
    }
  ]
});

// Associations are usually handled in a central file, but keeping them here if they were here.
// However, the original file had them. Let's keep them but use clean definitions.

module.exports = Stock;
