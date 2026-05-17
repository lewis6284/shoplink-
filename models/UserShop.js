const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserShop = sequelize.define('UserShop', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  UserId: {
    type: DataTypes.CHAR(36),
    allowNull: false
  },
  ShopId: {
    type: DataTypes.CHAR(36),
    allowNull: false
  },
  role_in_shop: {
    type: DataTypes.ENUM('manager', 'cashier'),
    allowNull: false
  }
}, {
  tableName: 'UserShops',
  timestamps: true,
  updatedAt: false
});

module.exports = UserShop;
