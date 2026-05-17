const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.CHAR(36),
    references: {
      model: User,
      key: 'id'
    }
  },
  device_uuid: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false
  },
  device_name: {
    type: DataTypes.STRING(255)
  },
  platform: {
    type: DataTypes.STRING(100)
  },
  browser: {
    type: DataTypes.STRING(100)
  },
  last_login: {
    type: DataTypes.DATE
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'devices'
});

Device.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Device, { foreignKey: 'user_id', as: 'devices' });

module.exports = Device;
