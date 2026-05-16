const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Product = require('./Product');
const Shop = require('./Shop');
const User = require('./User');

const StockTransfer = sequelize.define('StockTransfer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ProductId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Product, key: 'id' }
  },
  Quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0.01 }
  },
  FromShopId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Shop, key: 'id' }
  },
  ToShopId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Shop, key: 'id' }
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'),
    defaultValue: 'PENDING'
  },
  tracking_code: {
    type: DataTypes.STRING,
    unique: true
  },
  idempotency_key: {
    type: DataTypes.UUID,
    unique: true
  },
  CreatedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  ApprovedBy: {
    type: DataTypes.UUID,
    references: { model: User, key: 'id' }
  },
  ReceivedBy: {
    type: DataTypes.UUID,
    references: { model: User, key: 'id' }
  },
  notes: {
    type: DataTypes.TEXT
  },
  estimated_arrival_date: {
    type: DataTypes.DATE
  },
  receivedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'StockTransfers'
});

StockTransfer.belongsTo(Product);
StockTransfer.belongsTo(Shop, { as: 'FromShop', foreignKey: 'FromShopId' });
StockTransfer.belongsTo(Shop, { as: 'ToShop', foreignKey: 'ToShopId' });
StockTransfer.belongsTo(User, { as: 'Creator', foreignKey: 'CreatedBy' });
StockTransfer.belongsTo(User, { as: 'Approver', foreignKey: 'ApprovedBy' });
StockTransfer.belongsTo(User, { as: 'Receiver', foreignKey: 'ReceivedBy' });

module.exports = StockTransfer;
