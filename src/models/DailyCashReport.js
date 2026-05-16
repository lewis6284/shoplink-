const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const DailyCashReport = sequelize.define('DailyCashReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    references: { model: User, key: 'id' }
  },
  opening_balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  closing_balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  total_sales: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  total_expenses: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  report_date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'daily_cash_reports'
});

DailyCashReport.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(DailyCashReport, { foreignKey: 'user_id' });

module.exports = DailyCashReport;
