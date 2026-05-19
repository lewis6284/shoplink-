
// --- SERVICE LOGIC INLINED ---
const Purchase = require('../models/Purchase');
const PurchaseItem = require('../models/PurchaseItem');
const StockController = require('./stock.controller');
const AuditService = require('../utils/audit');
const { sequelize } = require('../config/database');

const PurchaseService = {
  async createPurchase(purchaseData, items, userId, req = null) {
    const transaction = await sequelize.transaction();
    try {
      // 1. Create Purchase
      const purchase = await Purchase.create({
        ...purchaseData,
        ShopId: purchaseData.ShopId || req?.shopId,
        status: 'COMPLETED'
      }, { transaction });

      // 2. Create Items and Update Stock
      for (const item of items) {
        await PurchaseItem.create({
          ...item,
          PurchaseId: purchase.id
        }, { transaction });

        // Update Stock (Add)
        await StockController.adjustStock(
          purchase.ShopId,
          item.ProductId,
          item.quantityPurchased,
          'IN',
          'PURCHASE',
          purchase.id,
          `Purchase recorded`,
          transaction
        );
      }

      // 3. Audit Log
      await AuditService.log({
        userId: userId,
        actionType: 'PURCHASE_CREATED',
        tableName: 'Purchases',
        oldValues: null,
        newValues: purchase.toJSON()
      });

      await transaction.commit();
      return purchase;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};




// --- CONTROLLER LOGIC ---

const ApiResponse = require('../utils/response');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');


  exports.getAll = async (req, res, next) => {
    try {
      const purchases = await Purchase.findAll({
        include: [
          { model: Supplier },
          { model: PurchaseItem, include: [{ model: Product }] }
        ],
        order: [['createdAt', 'DESC']]
      });
      return ApiResponse.success(res, purchases);
    } catch (error) {
      next(error);
    }
  }

  exports.getById = async (req, res, next) => {
    try {
      const purchase = await Purchase.findByPk(req.params.id, {
        include: [
          { model: Supplier },
          { model: PurchaseItem, include: [{ model: Product }] }
        ]
      });
      if (!purchase) return ApiResponse.error(res, 'Purchase not found', 404);
      return ApiResponse.success(res, purchase);
    } catch (error) {
      next(error);
    }
  }

  exports.create = async (req, res, next) => {
    try {
      let { items, purchaseData } = req.body;

      if (!purchaseData) {
        const { items: _, ...rest } = req.body;
        purchaseData = rest;
      }

      const purchase = await PurchaseService.createPurchase(purchaseData, items, req.user.id, req);
      return ApiResponse.success(res, purchase, 'Purchase created successfully', 201);
    } catch (error) {
      next(error);
    }
  }




