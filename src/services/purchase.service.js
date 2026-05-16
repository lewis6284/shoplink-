const Purchase = require('../models/Purchase');
const PurchaseItem = require('../models/PurchaseItem');
const StockService = require('./stock.service');
const AuditService = require('./audit.service');
const { sequelize } = require('../config/database');

class PurchaseService {
  static async createPurchase(purchaseData, items, userId, req = null) {
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
        await StockService.adjustStock(
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
      await AuditService.log(
        userId,
        'PURCHASE_CREATED',
        'Purchases',
        purchase.id,
        null,
        purchase.toJSON(),
        req
      );

      await transaction.commit();
      return purchase;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = PurchaseService;
