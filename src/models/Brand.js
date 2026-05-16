const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Brand = sequelize.define('Brand', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'Brands',
  timestamps: true
});

module.exports = Brand;
