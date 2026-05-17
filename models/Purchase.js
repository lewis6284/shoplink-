const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Supplier = require('./Supplier');

const Purchase = sequelize.define('Purchase', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'PENDING'
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  notes: {
    type: DataTypes.TEXT
  },
  SupplierId: {
    type: DataTypes.CHAR(36),
    references: { model: Supplier, key: 'id' }
  },
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: false
  }
}, {
  tableName: 'Purchases'
});

Purchase.belongsTo(Supplier, { foreignKey: 'SupplierId' });
Supplier.hasMany(Purchase, { foreignKey: 'SupplierId' });

module.exports = Purchase;
