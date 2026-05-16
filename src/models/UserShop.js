const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserShop = sequelize.define('UserShop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  UserId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  ShopId: {
    type: DataTypes.UUID,
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
