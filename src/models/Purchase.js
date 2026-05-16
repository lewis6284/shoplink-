const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Supplier = require('./Supplier');

const Purchase = sequelize.define('Purchase', {
  id: {
    type: DataTypes.UUID,
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
    type: DataTypes.UUID,
    references: { model: Supplier, key: 'id' }
  },
  ShopId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'Purchases'
});

Purchase.belongsTo(Supplier, { foreignKey: 'SupplierId' });
Supplier.hasMany(Purchase, { foreignKey: 'SupplierId' });

module.exports = Purchase;
