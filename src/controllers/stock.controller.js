const StockService = require('../services/stock.service');
const ApiResponse = require('../utils/response');
const Stock = require('../models/Stock');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { sequelize } = require('../config/database');
const AuditService = require('../services/audit.service');

class StockController {
  /**
   * Get all stocks (Global for admin/owner, Shop-specific for manager)
   */
  static async getAll(req, res, next) {
    try {
      const { shop_id, product_id, low_stock } = req.query;
      
      const where = {};
      if (req.user.role !== 'owner') {
        where.ShopId = req.user.ShopId; // Use req.user.ShopId for safety
      } else if (shop_id) {
        where.ShopId = shop_id;
      }

      if (product_id) {
        where.ProductId = product_id;
      }

      const stocks = await Stock.findAll({
        where,
        include: [
          { 
            model: Product,
            required: false,
            include: [{ model: Category, required: false }]
          }
        ],
        order: [['updatedAt', 'DESC']]
      });

      // Filter for low stock if requested
      let results = stocks;
      if (low_stock === 'true') {
        results = stocks.filter(s => s.quantity <= (s.Product?.alertQuantity || 10));
      }

      return ApiResponse.success(res, results);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add Stock (Receiving goods)
   */
  static async add(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { product_id, quantity, description, localId, deviceId } = req.body;
      const shopId = req.shopId || req.body.shop_id;

      if (!shopId) return ApiResponse.error(res, 'ShopId is required', 400);

      const { stock, movement } = await StockService.adjustStock(
        shopId,
        product_id,
        quantity,
        'IN',
        'PURCHASE',
        null,
        description || 'Stock addition (manual)',
        transaction
      );

      // Update sync info if provided
      if (localId || deviceId) {
        await movement.update({ localId, deviceId }, { transaction });
      }

      await AuditService.log(
        req.user.id,
        'STOCK_ADDITION',
        'Stocks',
        stock.id,
        null,
        { quantity, shopId, productId: product_id },
        req
      );

      await transaction.commit();
      return ApiResponse.success(res, stock, 'Stock added successfully');
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }

  /**
   * Adjust Stock (Inventory correction)
   */
  static async adjust(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { product_id, quantity, reason, description, localId, deviceId } = req.body;
      const shopId = req.shopId || req.body.shop_id;

      if (!shopId) return ApiResponse.error(res, 'ShopId is required', 400);

      // Get current stock with lock
      const stockRecord = await Stock.findOne({ 
        where: { ProductId: product_id, ShopId: shopId },
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      const currentQty = stockRecord ? parseFloat(stockRecord.quantity) : 0;
      const diff = quantity - currentQty;

      if (diff === 0) {
        await transaction.rollback();
        return ApiResponse.success(res, stockRecord, 'No change in stock');
      }

      const type = diff > 0 ? 'IN' : 'OUT';
      const actualReason = reason || 'ADJUSTMENT';

      const { stock, movement } = await StockService.adjustStock(
        shopId,
        product_id,
        diff,
        type,
        actualReason,
        null,
        description || `Inventory adjustment: ${currentQty} -> ${quantity}`,
        transaction
      );

      if (localId || deviceId) {
        await movement.update({ localId, deviceId }, { transaction });
      }

      await AuditService.log(
        req.user.id,
        'STOCK_ADJUSTMENT',
        'Stocks',
        stock.id,
        { old_quantity: currentQty },
        { new_quantity: quantity, reason: actualReason },
        req
      );

      await transaction.commit();
      return ApiResponse.success(res, stock, 'Stock adjusted successfully');
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }

  /**
   * Get Stock Movements
   */
  static async getMovements(req, res, next) {
    try {
      const { shop_id, product_id, type, reason } = req.query;
      
      const stockWhere = {};
      if (req.user.role !== 'owner') {
        stockWhere.ShopId = req.user.ShopId;
      } else if (shop_id) {
        stockWhere.ShopId = shop_id;
      }

      if (product_id) {
        stockWhere.ProductId = product_id;
      }

      const movementWhere = {};
      if (type) movementWhere.type = type;
      if (reason) movementWhere.reason = reason;

      const movements = await StockMovement.findAll({
        where: movementWhere,
        include: [
          { 
            model: Stock,
            where: stockWhere,
            required: true,
            include: [{ model: Product }]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 100
      });

      return ApiResponse.success(res, movements);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StockController;
