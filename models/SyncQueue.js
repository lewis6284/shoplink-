const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SyncQueue = sequelize.define('SyncQueue', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: false
    // sale / stock / customer
  },
  entity_id: {
    type: DataTypes.STRING(100),
    allowNull: false
    // The UUID or local ID from the frontend to prevent duplicates
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false
  },
  sync_status: {
    type: DataTypes.ENUM('pending', 'synced', 'failed'),
    defaultValue: 'pending'
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_error: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'sync_queue',
  indexes: [
    {
      unique: true,
      fields: ['entity_type', 'entity_id']
    }
  ]
});

module.exports = SyncQueue;
