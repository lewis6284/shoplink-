const ApiResponse = require('../utils/response');

/**
 * Base controller for generic CRUD operations
 */
class BaseController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const query = { ...req.query };
      // Only apply ShopId filter if the model has it and shopId is set
      if (req.shopId && this.service.model.rawAttributes.ShopId) {
        query.ShopId = req.shopId;
      }
      const records = await this.service.getAll(query);
      return ApiResponse.success(res, records);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const query = { id: req.params.id };
      if (req.shopId && this.service.model.rawAttributes.ShopId) {
        query.ShopId = req.shopId;
      }
      const records = await this.service.getAll(query);
      if (!records || records.length === 0) {
        return ApiResponse.error(res, 'Record not found', 404);
      }
      return ApiResponse.success(res, records[0]);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const data = { ...req.body };
      if (req.shopId && this.service.model.rawAttributes.ShopId) {
        data.ShopId = req.shopId;
      }
      const record = await this.service.create(data, req.user?.id, req);
      return ApiResponse.success(res, record, 'Created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      // Use getById (no tenant filter) so owner/manager can update any record across shops
      let existing;
      try {
        existing = await this.service.getById(req.params.id);
      } catch (e) {
        return ApiResponse.error(res, 'Record not found or access denied', 404);
      }

      // Enforce shop isolation ONLY for roles other than owner and manager
      if (
        req.user.role !== 'owner' &&
        req.user.role !== 'manager' &&
        req.shopId &&
        existing.ShopId &&
        existing.ShopId !== req.shopId
      ) {
        return ApiResponse.error(res, 'Access denied: record belongs to another shop', 403);
      }

      const record = await this.service.update(req.params.id, req.body, req.user?.id, req);
      return ApiResponse.success(res, record, 'Updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      let existing;
      try {
        existing = await this.service.getById(req.params.id);
      } catch (e) {
        return ApiResponse.error(res, 'Record not found or access denied', 404);
      }

      // Enforce shop isolation ONLY for roles other than owner and manager
      if (
        req.user.role !== 'owner' &&
        req.user.role !== 'manager' &&
        req.shopId &&
        existing.ShopId &&
        existing.ShopId !== req.shopId
      ) {
        return ApiResponse.error(res, 'Access denied: record belongs to another shop', 403);
      }

      const result = await this.service.delete(req.params.id, req.user?.id, req);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = BaseController;
