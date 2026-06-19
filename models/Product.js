const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Category = require('./Category');
const Brand = require('./Brand');
const Supplier = require('./Supplier');
const GlobalStock = require('./GlobalStock');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: true
  },
  // product_code: {
  //   type: DataTypes.STRING(50),
  //   unique: true,
  //   allowNull: false
  // },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  barcode: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: true
  },
  unit_of_measure: {
    type: DataTypes.CHAR(36),
    allowNull: true
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sellingPrice: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  partnerPrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  wholesalePrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  tax_type: {
    type: DataTypes.ENUM('TVA', 'HTVA'),
    defaultValue: 'HTVA'
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  CategoryId: {
    type: DataTypes.CHAR(36),
    allowNull: true
  },
  BrandId: {
    type: DataTypes.CHAR(36),
    allowNull: true
  },
  SupplierId: {
    type: DataTypes.CHAR(36),
    allowNull: true
  }
}, {
  tableName: 'Products',
  timestamps: true
});

// Associations
Product.belongsTo(Category, { foreignKey: 'CategoryId' });
Product.belongsTo(Brand, { foreignKey: 'BrandId' });
Product.belongsTo(Supplier, { foreignKey: 'SupplierId' });
Product.hasOne(GlobalStock, { foreignKey: 'ProductId' });

module.exports = Product;
