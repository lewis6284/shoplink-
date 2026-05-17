const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Stock = require('./Stock');

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('IN', 'OUT', 'ADJUSTMENT'),
    allowNull: false
  },
  reason: {
    type: DataTypes.ENUM('PURCHASE', 'SALE', 'LOSS', 'FREE', 'ADJUSTMENT'),
    allowNull: false
  },
  quantityChange: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  previousQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  newQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255)
  },
  referenceId: {
    type: DataTypes.CHAR(36)
  },
  StockId: {
    type: DataTypes.CHAR(36),
    references: { model: Stock, key: 'id' }
  },
  localId: {
    type: DataTypes.CHAR(36),
    unique: true
  },
  deviceId: {
    type: DataTypes.STRING(100)
  },
  syncStatus: {
    type: DataTypes.ENUM('pending', 'synced'),
    defaultValue: 'synced'
  }
}, {
  tableName: 'StockMovements'
});

StockMovement.belongsTo(Stock, { foreignKey: 'StockId' });
Stock.hasMany(StockMovement, { foreignKey: 'StockId' });

module.exports = StockMovement;
