const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  UserId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING(100)
  },
  device_info: {
    type: DataTypes.TEXT
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'Sessions',
  timestamps: true,
  updatedAt: false
});

module.exports = Session;
