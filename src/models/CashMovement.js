const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const CashRegister = require('./CashRegister');

const CashMovement = sequelize.define('CashMovement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('IN', 'OUT'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING(255)
  },
  referenceId: {
    type: DataTypes.UUID
  },
  CashRegisterId: {
    type: DataTypes.UUID,
    references: { model: CashRegister, key: 'id' }
  }
}, {
  tableName: 'CashMovements'
});

CashMovement.belongsTo(CashRegister, { foreignKey: 'CashRegisterId' });
CashRegister.hasMany(CashMovement, { foreignKey: 'CashRegisterId' });

module.exports = CashMovement;
