const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT
  },
  phone: {
    type: DataTypes.STRING(50)
  },
  email: {
    type: DataTypes.STRING(150)
  },
  logo_url: {
    type: DataTypes.TEXT,
    defaultValue: '/logo.png'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      currency: 'FBU',
      tax_percentage: 0,
      receipt_footer: 'Thank you for shopping with us!'
    }
  },
  type: {
    type: DataTypes.ENUM('WAREHOUSE', 'RETAIL'),
    defaultValue: 'RETAIL'
  }
}, {
  tableName: 'Shops',
  timestamps: true,
  paranoid: true
});

module.exports = Shop;
