const Customer = require('../models/Customer');
const ApiResponse = require('../utils/response');

const { Op } = require('sequelize');

exports.getAll = async (req, res, next) => {
  try {
    const { search, ...restQuery } = req.query;
    const query = { ...restQuery };

    if (req.shopId && Customer.rawAttributes.ShopId) {
      query.ShopId = req.shopId;
    }

    if (search) {
      query[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const records = await Customer.findAll({ 
      where: query,
      order: [['full_name', 'ASC']]
    });
    return ApiResponse.success(res, records);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const query = { id: req.params.id };
    if (req.shopId && Customer.rawAttributes.ShopId) {
      query.ShopId = req.shopId;
    }
    const records = await Customer.findAll({ where: query });
    if (!records || records.length === 0) {
      return ApiResponse.error(res, 'Record not found', 404);
    }
    return ApiResponse.success(res, records[0]);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.shopId && Customer.rawAttributes.ShopId) {
      data.ShopId = req.shopId;
    }
    const record = await Customer.create(data);
    return ApiResponse.success(res, record, 'Created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    let existing = await Customer.findByPk(req.params.id);
    if (!existing) {
      return ApiResponse.error(res, 'Record not found', 404);
    }

    if (
      req.user && req.user.role !== 'owner' &&
      req.user.role !== 'manager' &&
      req.shopId &&
      existing.ShopId &&
      existing.ShopId !== req.shopId
    ) {
      return ApiResponse.error(res, 'Access denied', 403);
    }

    await existing.update(req.body);
    return ApiResponse.success(res, existing, 'Updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    let existing = await Customer.findByPk(req.params.id);
    if (!existing) {
      return ApiResponse.error(res, 'Record not found', 404);
    }

    if (
      req.user && req.user.role !== 'owner' &&
      req.user.role !== 'manager' &&
      req.shopId &&
      existing.ShopId &&
      existing.ShopId !== req.shopId
    ) {
      return ApiResponse.error(res, 'Access denied', 403);
    }

    await existing.destroy();
    return ApiResponse.success(res, null, 'Deleted successfully');
  } catch (error) {
    next(error);
  }
};
