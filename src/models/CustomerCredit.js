const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Customer = require('./Customer');
const Sale = require('./Sale');

const CustomerCredit = sequelize.define('CustomerCredit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customer_id: {
    type: DataTypes.UUID,
    references: { model: Customer, key: 'id' }
  },
  sale_id: {
    type: DataTypes.UUID,
    references: { model: Sale, key: 'id' }
  },
  total_credit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  paid_credit: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  remaining_credit: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  due_date: {
    type: DataTypes.DATEONLY
  },
  status: {
    type: DataTypes.ENUM('pending', 'partial', 'paid'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'customer_credits'
});

CustomerCredit.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
CustomerCredit.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

Customer.hasMany(CustomerCredit, { foreignKey: 'customer_id' });
Sale.hasOne(CustomerCredit, { foreignKey: 'sale_id' });

module.exports = CustomerCredit;
