const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Unit = sequelize.define('Unit', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  short_name: {
    type: DataTypes.STRING(20),
    allowNull: false
  }
}, {
  tableName: 'units',
  timestamps: true
});

module.exports = Unit;
