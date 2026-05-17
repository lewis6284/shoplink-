const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Purchase = require('./Purchase');
const Product = require('./Product');

const PurchaseItem = sequelize.define('PurchaseItem', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quantityPurchased: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  PurchaseId: {
    type: DataTypes.CHAR(36),
    references: { model: Purchase, key: 'id' }
  },
  ProductId: {
    type: DataTypes.CHAR(36),
    references: { model: Product, key: 'id' }
  }
}, {
  tableName: 'PurchaseItems'
});

PurchaseItem.belongsTo(Purchase, { foreignKey: 'PurchaseId' });
PurchaseItem.belongsTo(Product, { foreignKey: 'ProductId' });

Purchase.hasMany(PurchaseItem, { foreignKey: 'PurchaseId' });
Product.hasMany(PurchaseItem, { foreignKey: 'ProductId' });

module.exports = PurchaseItem;
