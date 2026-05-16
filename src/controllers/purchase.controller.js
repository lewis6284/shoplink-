const PurchaseService = require('../services/purchase.service');
const ApiResponse = require('../utils/response');
const Purchase = require('../models/Purchase');
const PurchaseItem = require('../models/PurchaseItem');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

class PurchaseController {
  static async getAll(req, res, next) {
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

  static async getById(req, res, next) {
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

  static async create(req, res, next) {
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
}

module.exports = PurchaseController;
