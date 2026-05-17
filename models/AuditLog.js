const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.CHAR(36),
    allowNull: true
  },
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: true
  },
  action_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  table_name: {
    type: DataTypes.STRING(100)
  },
  old_values: {
    type: DataTypes.JSON
  },
  new_values: {
    type: DataTypes.JSON
  }
}, {
  tableName: 'audit_logs',
  updatedAt: false
});

module.exports = AuditLog;
