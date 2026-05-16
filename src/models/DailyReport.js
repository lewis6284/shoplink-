const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Shop = require('./Shop');

const DailyReport = sequelize.define('DailyReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ShopId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  report_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  generated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  total_sales: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_expenses: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  net_profit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_tax: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_cogs: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  sale_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  payment_summary: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  cashier_breakdown: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  top_items: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  tableName: 'DailyReports',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['ShopId', 'report_date']
    }
  ]
});

DailyReport.belongsTo(Shop, { foreignKey: 'ShopId', as: 'shop' });
Shop.hasMany(DailyReport, { foreignKey: 'ShopId' });

module.exports = DailyReport;
