const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255)
  },
  message: {
    type: DataTypes.TEXT
  },
  type: {
    type: DataTypes.ENUM('warning', 'stock', 'sale'),
    defaultValue: 'sale'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'notifications'
});

module.exports = Notification;
