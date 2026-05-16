const transferService = require('../services/stock.transfer.service');
const ApiResponse = require('../utils/response');

class StockTransferController {
  async getAll(req, res, next) {
    try {
      const query = {};
      if (req.user.role !== 'owner') {
        // Managers see transfers related to their shop
        query[require('sequelize').Op.or] = [
          { FromShopId: req.user.ShopId },
          { ToShopId: req.user.ShopId }
        ];
      }
      const transfers = await transferService.getAll(query, { order: [['createdAt', 'DESC']] });
      return ApiResponse.success(res, transfers);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const transfer = await transferService.create(req.body, req.user.id, req);
      return ApiResponse.success(res, transfer, 'Transfer initiated', 201);
    } catch (error) {
      next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const transfer = await transferService.approve(req.params.id, req.user.id, req);
      return ApiResponse.success(res, transfer, 'Transfer approved and stock reserved');
    } catch (error) {
      next(error);
    }
  }

  async dispatch(req, res, next) {
    try {
      const transfer = await transferService.dispatch(req.params.id, req.user.id, req);
      return ApiResponse.success(res, transfer, 'Stock dispatched and in transit');
    } catch (error) {
      next(error);
    }
  }

  async receive(req, res, next) {
    try {
      const transfer = await transferService.receive(req.params.id, req.user.id, req);
      return ApiResponse.success(res, transfer, 'Stock received successfully');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const transfer = await transferService.cancel(req.params.id, req.user.id, req);
      return ApiResponse.success(res, transfer, 'Transfer cancelled');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StockTransferController();
