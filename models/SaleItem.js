const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Sale = require('./Sale');
const Product = require('./Product');

const SaleItem = sequelize.define('SaleItem', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  subTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unitCostSnapshot: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  SaleId: {
    type: DataTypes.CHAR(36),
    references: { model: Sale, key: 'id' }
  },
  ProductId: {
    type: DataTypes.CHAR(36),
    references: { model: Product, key: 'id' }
  }
}, {
  tableName: 'SaleItems'
});

SaleItem.belongsTo(Sale, { foreignKey: 'SaleId' });
SaleItem.belongsTo(Product, { foreignKey: 'ProductId' });

Sale.hasMany(SaleItem, { foreignKey: 'SaleId' });
Product.hasMany(SaleItem, { foreignKey: 'ProductId' });

module.exports = SaleItem;
