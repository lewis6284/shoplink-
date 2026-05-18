const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const CashRegister = require('./CashRegister');

const CashSession = sequelize.define('CashSession', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  CashRegisterId: {
    type: DataTypes.CHAR(36),
    references: { model: CashRegister, key: 'id' }
  },
  UserId: {
    type: DataTypes.CHAR(36)
  },
  ShopId: {
    type: DataTypes.CHAR(36)
  },
  opening_balance: {
    type: DataTypes.DECIMAL(15,2),
    defaultValue: 0
  },
  closing_balance: {
    type: DataTypes.DECIMAL(15,2),
    allowNull: true
  },
  opened_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('open','closed'),
    defaultValue: 'open'
  }
}, {
  tableName: 'CashSessions',
  timestamps: true
});

CashSession.belongsTo(CashRegister, { foreignKey: 'CashRegisterId' });
CashRegister.hasMany(CashSession, { foreignKey: 'CashRegisterId' });

module.exports = CashSession;
