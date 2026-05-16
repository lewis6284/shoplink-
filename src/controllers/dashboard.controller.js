const dashboardService = require('../services/dashboard.service');
const ApiResponse = require('../utils/response');

class DashboardController {
  async getGlobalStats(req, res, next) {
    try {
      const stats = await dashboardService.getGlobalStats();
      return ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getShopStats(req, res, next) {
    try {
      const shopId = req.params.shopId || req.shopId;
      if (!shopId) return ApiResponse.error(res, 'Shop ID required', 400);
      
      const stats = await dashboardService.getShopStats(shopId);
      return ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getDailyStats(req, res, next) {
    try {
      const stats = await dashboardService.getDailyStats(req.user.id, req.shopId);
      return ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
