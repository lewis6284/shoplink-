const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const CustomerCredit = require('./CustomerCredit');

const CreditPayment = sequelize.define('CreditPayment', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  credit_id: {
    type: DataTypes.CHAR(36),
    references: { model: CustomerCredit, key: 'id' }
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING(50)
  }
}, {
  tableName: 'credit_payments'
});

CreditPayment.belongsTo(CustomerCredit, { foreignKey: 'credit_id', as: 'credit' });
CustomerCredit.hasMany(CreditPayment, { foreignKey: 'credit_id', as: 'payments' });

module.exports = CreditPayment;
