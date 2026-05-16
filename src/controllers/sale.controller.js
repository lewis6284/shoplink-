const SaleService = require('../services/sale.service');
const ApiResponse = require('../utils/response');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { Op } = require('sequelize');

class SaleController {
  static async getAll(req, res, next) {
    try {
      const { shop_id, range, limit = 200 } = req.query;

      // Build date range filter
      const where = {};
      if (shop_id) where.ShopId = shop_id;

      if (range) {
        const now = new Date();
        const from = new Date();
        if (range === '7d')  from.setDate(now.getDate() - 7);
        else if (range === '30d') from.setDate(now.getDate() - 30);
        else if (range === '1y')  from.setFullYear(now.getFullYear() - 1);
        where.createdAt = { [Op.gte]: from };
      }

      const sales = await Sale.findAll({
        where,
        include: [
          { model: Customer, required: false },
          { model: User, required: false, attributes: ['id', 'full_name', 'email'] },
          { model: SaleItem, include: [{ model: Product, required: false }] }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit, 10)
      });
      return ApiResponse.success(res, sales);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const sale = await Sale.findByPk(req.params.id, {
        include: [
          { model: Customer },
          { model: SaleItem, include: [{ model: Product }] }
        ]
      });
      if (!sale) return ApiResponse.error(res, 'Sale not found', 404);
      return ApiResponse.success(res, sale);
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      let { items, saleData, idempotency_key } = req.body;
      
      // Handle case where body is directly the sale data (excluding items)
      if (!saleData) {
        const { items: _, ...rest } = req.body;
        saleData = rest;
      }

      // 🔒 Idempotency Check
      const key = idempotency_key || saleData.idempotency_key;
      if (key) {
        const existingSale = await Sale.findOne({ 
          where: { idempotency_key: key },
          include: [{ model: SaleItem, include: [Product] }]
        });
        if (existingSale) {
          return ApiResponse.success(res, existingSale, 'Sale already processed (Idempotent)', 200);
        }
      }
      
      const sale = await SaleService.createSale({ ...saleData, idempotency_key: key }, items, req.user.id, req);
      return ApiResponse.success(res, sale, 'Sale created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req, res, next) {
    try {
      const { reason } = req.body;
      const sale = await SaleService.cancelSale(req.params.id, req.user.id, reason, req);
      return ApiResponse.success(res, sale, 'Sale cancelled successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SaleController;
