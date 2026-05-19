
// --- SERVICE LOGIC INLINED ---
const { sequelize } = require('../config/database');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Expense = require('../models/Expense');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { Op, fn, col } = require('sequelize');

const DashboardService = {
  /**
   * ADMIN / OWNER Global Dashboard
   */
  async getGlobalStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalShops,
      todaySales,
      todayGrossProfitRaw,
      lowStockProducts,
      recentLogs,
      topShopRaw
    ] = await Promise.all([
      Shop.count({ where: { status: 'active' } }),
      Sale.sum('total_amount', { 
        where: { 
          status: 'COMPLETED',
          createdAt: { [Op.between]: [todayStart, todayEnd] }
        } 
      }),
      SaleItem.findAll({
        attributes: ['quantity', 'subTotal', 'unitCostSnapshot'],
        include: [{
          model: Sale,
          where: {
            status: 'COMPLETED',
            createdAt: { [Op.between]: [todayStart, todayEnd] }
          },
          attributes: []
        }],
        raw: true
      }),
      Stock.count({ where: { quantity: { [Op.lt]: 10 } } }),
      AuditLog.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [{ model: User, attributes: ['full_name'] }]
      }),
      Sale.findAll({
        attributes: [
          'ShopId',
          [fn('SUM', col('total_amount')), 'revenue']
        ],
        where: { status: 'COMPLETED' },
        group: ['ShopId'],
        order: [[fn('SUM', col('total_amount')), 'DESC']],
        limit: 1,
        include: [{ model: Shop, attributes: ['name'] }],
        raw: true,
        nest: true
      })
    ]);

    // Calculate Gross Profit (based on product purchase cost snapshotted during sale)
    const netProfit = todayGrossProfitRaw.reduce((sum, item) => {
      const qty = parseFloat(item.quantity || 0);
      const sub = parseFloat(item.subTotal || 0);
      const cost = parseFloat(item.unitCostSnapshot || 0);
      return sum + (sub - (qty * cost));
    }, 0);

    return {
      totalShops,
      todaySales: todaySales || 0,
      totalExpenses: 0,
      netProfit,
      lowStockCount: lowStockProducts || 0,
      recentLogs,
      topShop: topShopRaw[0] ? {
        name: topShopRaw[0].Shop.name,
        revenue: topShopRaw[0].revenue
      } : null,
      // Placeholders for complex metrics
      totalTva: (todaySales || 0) * 0.18,
      totalNtva: (todaySales || 0) * 0.82,
      pendingTransfers: 0
    };
  },

  /**
   * SHOP / MANAGER Dashboard
   */
  async getShopStats(shopId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      todaySales,
      todayGrossProfitRaw,
      lowStockCount,
      topProducts,
      cashierPerformances
    ] = await Promise.all([
      Sale.sum('total_amount', { 
        where: { 
          ShopId: shopId,
          status: 'COMPLETED',
          createdAt: { [Op.between]: [todayStart, todayEnd] }
        } 
      }),
      SaleItem.findAll({
        attributes: ['quantity', 'subTotal', 'unitCostSnapshot'],
        include: [{
          model: Sale,
          where: {
            ShopId: shopId,
            status: 'COMPLETED',
            createdAt: { [Op.between]: [todayStart, todayEnd] }
          },
          attributes: []
        }],
        raw: true
      }),
      Stock.count({ 
        where: { 
          ShopId: shopId,
          quantity: { [Op.lt]: 10 } 
        } 
      }),
      sequelize.query(`
        SELECT p.name, SUM(si.quantity) as soldQuantity, SUM(si.subTotal) as revenue
        FROM SaleItems si
        JOIN Products p ON si.ProductId = p.id
        JOIN Sales s ON si.SaleId = s.id
        WHERE s.ShopId = ? AND s.status = 'COMPLETED'
        GROUP BY p.id
        ORDER BY soldQuantity DESC
        LIMIT 5
      `, { replacements: [shopId], type: sequelize.QueryTypes.SELECT }),
      sequelize.query(`
        SELECT u.full_name as name, COUNT(s.id) as salesCount, SUM(s.total_amount) as revenue
        FROM Sales s
        JOIN users u ON s.UserId = u.id
        WHERE s.ShopId = ? AND s.status = 'COMPLETED' AND s.createdAt BETWEEN ? AND ?
        GROUP BY u.id
        ORDER BY revenue DESC
      `, { replacements: [shopId, todayStart, todayEnd], type: sequelize.QueryTypes.SELECT })
    ]);

    const netProfit = todayGrossProfitRaw.reduce((sum, item) => {
      const qty = parseFloat(item.quantity || 0);
      const sub = parseFloat(item.subTotal || 0);
      const cost = parseFloat(item.unitCostSnapshot || 0);
      return sum + (sub - (qty * cost));
    }, 0);

    return {
      todaySales: todaySales || 0,
      totalExpenses: 0,
      netProfit,
      lowStockCount: lowStockCount || 0,
      topProducts,
      cashierPerformances
    };
  },

  /**
   * CASHIER Daily Dashboard
   */
  async getDailyStats(userId, shopId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      myStats,
      paymentMethodStats,
      recentSales
    ] = await Promise.all([
      Sale.findAll({
        attributes: [
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('total_amount')), 'total']
        ],
        where: {
          UserId: userId,
          ShopId: shopId,
          status: 'COMPLETED',
          createdAt: { [Op.between]: [todayStart, todayEnd] }
        },
        raw: true
      }),
      Sale.findAll({
        attributes: [
          'paymentMethod',
          [fn('SUM', col('total_amount')), 'total']
        ],
        where: {
          ShopId: shopId,
          status: 'COMPLETED',
          createdAt: { [Op.between]: [todayStart, todayEnd] }
        },
        group: ['paymentMethod'],
        raw: true
      }),
      Sale.findAll({
        where: { ShopId: shopId, UserId: userId },
        limit: 5,
        order: [['createdAt', 'DESC']]
      })
    ]);

    const cashTotal = paymentMethodStats.find(p => p.paymentMethod === 'CASH')?.total || 0;
    const mobileTotal = paymentMethodStats.find(p => p.paymentMethod === 'MOBILE_MONEY')?.total || 0;

    return {
      myCount: myStats[0].count || 0,
      myTotal: myStats[0].total || 0,
      cashTotal,
      mobileTotal,
      recentSales
    };
  }
};




// --- CONTROLLER LOGIC ---

const ApiResponse = require('../utils/response');


exports.getGlobalStats = async (req, res, next) => {
    try {
      const stats = await DashboardService.getGlobalStats();
      return ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  },

exports.getShopStats = async (req, res, next) => {
    try {
      const shopId = req.params.shopId || req.shopId;
      if (!shopId) return ApiResponse.error(res, 'Shop ID required', 400);
      
      const stats = await DashboardService.getShopStats(shopId);
      return ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  },

exports.getDailyStats = async (req, res, next) => {
    try {
      const stats = await DashboardService.getDailyStats(req.user.id, req.shopId);
      return ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  }




