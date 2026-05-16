const Stock = require('../models/Stock');
const StockMovement = require('../models/StockMovement');
const { literal, Transaction } = require('sequelize');

class StockService {
  /**
   * Adjust stock atomically using SQL increments and Row Locking
   */
  static async adjustStock(shopId, productId, quantityChange, type, reason, referenceId, description = '', transaction = null) {
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
}

module.exports = StockService;
