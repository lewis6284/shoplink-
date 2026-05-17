const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GlobalStock = sequelize.define('GlobalStock', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ProductId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    unique: true
  },
  quantity: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  reserved_quantity: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  }
}, {
  tableName: 'GlobalStocks',
  timestamps: true,
  createdAt: false
});

module.exports = GlobalStock;
