const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Stock = require('./Stock');

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.UUID,
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
    type: DataTypes.UUID
  },
  StockId: {
    type: DataTypes.UUID,
    references: { model: Stock, key: 'id' }
  },
  localId: {
    type: DataTypes.UUID,
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
