const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Invoice = require('../models/Invoice');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const PricingEngine = require('./pricingEngine');
const FinancialService = require('./financialService');
const AuditService = require('./audit.service');
const { sequelize } = require('../config/database');

class SaleService {
  /**
   * Create a Sale with full POS Logic
   */
  static async createSale(saleData, items, userId, req = null) {
    const transaction = await sequelize.transaction();
    const shopId = saleData.ShopId || req?.shopId;

    try {
      // 1. Validate Stock & Calculate Totals
      let subtotal = 0;
      let taxAmount = 0;
      const processedItems = [];

      for (const item of items) {
        const product = await Product.findByPk(item.ProductId, { transaction });
        if (!product) throw new Error(`Product ${item.ProductId} not found`);

        // Check Shop Stock
        const stock = await Stock.findOne({
          where: { ProductId: item.ProductId, ShopId: shopId },
          transaction
        });

        if (!stock || Number(stock.quantity) < Number(item.quantity)) {
          throw new Error(`Insufficient stock for ${product.name} at this shop`);
        }

        // Apply Pricing Engine
        const pricing = PricingEngine.calculate(product, saleData.customerType || 'retail', item.quantity);
        
        processedItems.push({
          ProductId: item.ProductId,
          quantity: item.quantity,
          unitPrice: pricing.unitPrice,
          subTotal: pricing.total,
          unitCostSnapshot: product.purchasePrice,
          taxType: pricing.taxType
        });

        subtotal += Number(pricing.subtotal);
        taxAmount += Number(pricing.taxAmount);

        // Reduce Stock
        stock.quantity = Number(stock.quantity) - Number(item.quantity);
        await stock.save({ transaction });
      }

      const totalAmount = subtotal + taxAmount;

      // 2. Create Sale Header
      const cashSessionId = saleData.CashSessionId || req?.cashSessionId || req?.headers?.['x-cash-session-id'] || null;
      const saleTaxType = processedItems.some(item => item.taxType === 'TVA') ? 'TVA' : 'NTVA';
      const sale = await Sale.create({
        ...saleData,
        ShopId: shopId,
        UserId: userId,
        CashSessionId: cashSessionId,
        subtotal,
        tax_amount: taxAmount,
        tax_type: saleTaxType,
        total_amount: totalAmount,
        status: 'COMPLETED'
      }, { transaction });

      // 3. Create Sale Items
      await SaleItem.bulkCreate(processedItems.map(pi => ({
        ProductId: pi.ProductId,
        quantity: pi.quantity,
        unitPrice: pi.unitPrice,
        subTotal: pi.subTotal,
        unitCostSnapshot: pi.unitCostSnapshot,
        SaleId: sale.id
      })), { transaction });

      // 4. Generate Auto Invoice
      const invoiceNumber = 'INV-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
      const now = new Date();
      const invoice = await Invoice.create({
        SaleId: sale.id,
        ShopId: shopId,
        UserId: userId,
        invoice_number: invoiceNumber,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        tax_type: processedItems[0]?.taxType || 'NTVA',
        status: 'GENERATED',
        createdAt: now,
        updatedAt: now
      }, { transaction });

      // 5. Update Shop Financials
      await FinancialService.recordSale(shopId, totalAmount, taxAmount, processedItems[0]?.taxType);

      // 6. Audit Log
      await AuditService.log({
        userId,
        shopId,
        actionType: 'SALE_CREATE',
        tableName: 'Sales',
        newValues: { saleId: sale.id, invoiceNumber, CashSessionId: cashSessionId }
      });

      await transaction.commit();
      return { sale, invoice };
    } catch (error) {
      await transaction.rollback();
      console.error('🔥 POS Transaction Failed:', error.message);
      throw error;
    }
  }
}

module.exports = SaleService;
