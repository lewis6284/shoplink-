const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  parent_id: {
    type: DataTypes.CHAR(36),
    allowNull: true
  }
}, {
  tableName: 'Categories',
  timestamps: true
});

module.exports = Category;
