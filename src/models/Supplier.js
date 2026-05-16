const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  contact_name: {
    type: DataTypes.STRING(255)
  },
  phone: {
    type: DataTypes.STRING(50)
  },
  email: {
    type: DataTypes.STRING(255)
  },
  address: {
    type: DataTypes.TEXT
  },
  ShopId: {
    type: DataTypes.CHAR(36)
  },
  is_active: {
    type: DataTypes.TINYINT(1),
    defaultValue: 1
  }
}, {
  tableName: 'Suppliers',
  timestamps: true
});

module.exports = Supplier;
