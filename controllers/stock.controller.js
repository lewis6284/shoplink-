
// --- SERVICE LOGIC INLINED ---
const Stock = require('../models/Stock');
const StockMovement = require('../models/StockMovement');
const { literal, Transaction } = require('sequelize');

exports.adjustStock = async (shopId, productId, quantityChange, type, reason, referenceId, description = '', transaction = null) => {
    if (!shopId) throw new Error('shopId is required for stock adjustment');
    
    // Ensure we are in a transaction if possible, or create a scoped one if we want absolute safety
    // But usually the controller should provide the transaction
    const t = transaction;

    // 1. Get current stock state with LOCK for update
    // This prevents concurrent adjustments from reading the same previousQuantity
    let stock = await Stock.findOne({
      where: { ProductId: productId, ShopId: shopId },
      lock: t ? t.LOCK.UPDATE : true, // Lock the row
      transaction: t
    });

    if (!stock) {
      stock = await Stock.create({ 
        ProductId: productId, 
        ShopId: shopId, 
        quantity: 0 
      }, { transaction: t });
    }

    const previousQuantity = parseFloat(stock.quantity);
    const change = parseFloat(quantityChange);
    const newQuantity = previousQuantity + change;

    // 2. Update stock quantity
    // We update the model instance and save it within the locked transaction
    stock.quantity = newQuantity;
    await stock.save({ transaction: t });

    // 3. Create movement log
    const movement = await StockMovement.create({
      StockId: stock.id,
      type,
      reason,
      quantityChange: change,
      previousQuantity,
      newQuantity,
      description,
      referenceId,
      syncStatus: 'synced'
    }, { transaction: t });

    return { stock, movement };
  }
// --- CONTROLLER LOGIC ---

const ApiResponse = require('../utils/response');
const Product = require('../models/Product');
const Category = require('../models/Category');
const AuditService = require('../utils/audit');
const { sequelize } = require('../config/database');



  /**
   * Get all stocks (Global for admin/owner, Shop-specific for manager)
   */
  exports.getAll = async (req, res, next) => {
    try {
      const { shop_id, product_id, low_stock } = req.query;
      
      const where = {};
      if (req.user.role !== 'owner') {
        where.ShopId = req.user.ShopId; // Use req.user.ShopId for safety
      } else if (shop_id) {
        where.ShopId = shop_id;
      } if (product_id) {
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
  exports.add = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
      const { product_id, quantity, description, localId, deviceId } = req.body;
      const shopId = req.shopId || req.body.shop_id;

      if (!shopId) return ApiResponse.error(res, 'ShopId is required', 400);

      const { stock, movement } = await exports.adjustStock(
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
  exports.adjust = async (req, res, next) => {
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

      const { stock, movement } = await exports.adjustStock(
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
  exports.getMovements = async (req, res, next) => {
    try {
      const { shop_id, product_id, type, reason } = req.query;
      
      const stockWhere = {};
      if (req.user.role !== 'owner') {
        stockWhere.ShopId = req.user.ShopId;
      } else if (shop_id) {
        stockWhere.ShopId = shop_id;
      } if (product_id) {
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




