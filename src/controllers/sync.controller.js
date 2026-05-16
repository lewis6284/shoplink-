const SyncService = require('../services/sync.service');
const ApiResponse = require('../utils/response');

class SyncController {
  static async syncSales(req, res, next) {
    try {
      const { batch } = req.body;
      if (!Array.isArray(batch)) {
        return ApiResponse.error(res, 'Batch must be an array', 400);
      }
      
      const results = await SyncService.syncSales(batch, req.user.id, req);
      return ApiResponse.success(res, results, 'Sync completed');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SyncController;
