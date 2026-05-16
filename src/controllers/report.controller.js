const ReportService = require('../services/report.service');
const ApiResponse = require('../utils/response');

class ReportController {
  static async daily(req, res, next) {
    try {
      const { date } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.daily(date, shopId);
      return ApiResponse.success(res, data, 'Daily report');
    } catch (error) {
      next(error);
    }
  }

  static async triggerDaily(req, res, next) {
    try {
      const { date } = req.body;
      const shopId = req.shopId || null;
      const data = await ReportService.generateDailyReportsForDate(date, shopId);
      return ApiResponse.success(res, data, 'Daily report generation triggered');
    } catch (error) {
      next(error);
    }
  }

  static async monthly(req, res, next) {
    try {
      const { year, month } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.monthly(year, month, shopId);
      return ApiResponse.success(res, data, 'Monthly report');
    } catch (error) {
      next(error);
    }
  }

  static async topProducts(req, res, next) {
    try {
      const { limit, start_date, end_date } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.topProducts(limit, start_date, end_date, shopId);
      return ApiResponse.success(res, data, 'Top products report');
    } catch (error) {
      next(error);
    }
  }

  static async profit(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.profit(start_date, end_date, shopId);
      return ApiResponse.success(res, data, 'Profit report');
    } catch (error) {
      next(error);
    }
  }

  static async stockAlerts(req, res, next) {
    try {
      const shopId = req.shopId || null;
      const data = await ReportService.stockAlerts(shopId);
      return ApiResponse.success(res, data, 'Stock alerts report');
    } catch (error) {
      next(error);
    }
  }

  static async employeeSales(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.employeeSales(start_date, end_date, shopId);
      return ApiResponse.success(res, data, 'Employee performance report');
    } catch (error) {
      next(error);
    }
  }

  static async ownerGlobal(req, res, next) {
    try {
      const { date } = req.query;
      // only owners should call this (enforced in routes)
      const data = await ReportService.ownerGlobal(date);
      return ApiResponse.success(res, data, 'Global per-shop report');
    } catch (error) {
      next(error);
    }
  }

  static async cashierPerformance(req, res, next) {
    try {
      const { start_date, end_date, user_id } = req.query;
      const shopId = req.shopId || null;
      // If cashier role, force user_id to current user
      const uid = req.user.role === 'cashier' ? req.user.id : user_id || null;
      const data = await ReportService.cashierPerformance({ userId: uid, startDate: start_date, endDate: end_date, shopId });
      return ApiResponse.success(res, data, 'Cashier performance report');
    } catch (error) {
      next(error);
    }
  }

  static async auditLogs(req, res, next) {
    try {
      const AuditLog = require('../models/AuditLog');
      const User = require('../models/User');
      const { shop_id } = req.query;
      
      const where = {};
      if (req.user.role !== 'owner') {
        where.shopId = req.user.ShopId;
      } else if (shop_id) {
        where.shopId = shop_id;
      }

      const logs = await AuditLog.findAll({
        where,
        include: [{ model: User, attributes: ['full_name'] }],
        order: [['createdAt', 'DESC']],
        limit: 100
      });
      return ApiResponse.success(res, logs, 'Audit logs fetched');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReportController;
