
// --- SERVICE LOGIC INLINED ---
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Invoice = require('../models/Invoice');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const PricingEngine = require('../utils/pricingEngine');
const FinancialService = require('../utils/financial');
const AuditService = require('../utils/audit');
const { sequelize } = require('../config/database');
const crypto = require('../utils/invoiceCrypto');

exports.createSale = async (saleData, items, userId, req = null) => {
    const transaction = await sequelize.transaction();
    const shopId = saleData.ShopId || req?.shopId;

    try {
      // 1. Validate Stock & Calculate Totals
      let subtotal = 0;
      let taxAmount = 0;
      const processedItems = [];

      let requiresApproval = false;
      if (saleData.CustomerId) {
        const Customer = require('../models/Customer');
        const customer = await Customer.findByPk(saleData.CustomerId, { transaction });
        if (customer && customer.customer_type === 'wholesale') {
          requiresApproval = true;
        }
      }

      const rawCustomerType = (saleData.customerType || 'retail').toLowerCase();
      const customerType = rawCustomerType === 'wholesale' ? 'wholesale' : 'retail';
      const priceType = customerType === 'wholesale' ? 'WHOLESALE' : 'RETAIL';

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

        // Apply Pricing Engine, mapping any legacy partner type to retail pricing
        const pricing = await PricingEngine.calculate(product, customerType, item.quantity, shopId);
        
        processedItems.push({
          ProductId: item.ProductId,
          quantity: item.quantity,
          unitPrice: pricing.unitPrice,
          subTotal: pricing.subtotal,
          unitCostSnapshot: product.purchasePrice,
          priceType,
          taxType: pricing.taxType
        });

        subtotal += Number(pricing.subtotal);
        taxAmount += Number(pricing.taxAmount);

        // Reduce Stock
        stock.quantity = Number(stock.quantity) - Number(item.quantity);
        await stock.save({ transaction });
      }

      const totalAmount = subtotal + taxAmount;
      const finalStatus = requiresApproval ? 'PENDING_APPROVAL' : 'COMPLETED';

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
        status: finalStatus
      }, { transaction });

      // 3. Create Sale Items
      await SaleItem.bulkCreate(processedItems.map(pi => ({
        ProductId: pi.ProductId,
        quantity: pi.quantity,
        unitPrice: pi.unitPrice,
        subTotal: pi.subTotal,
        unitCostSnapshot: pi.unitCostSnapshot,
        priceType: pi.priceType,
        SaleId: sale.id
      })), { transaction });

      let invoice = null;
      let invoiceNumber = null;

      if (!requiresApproval) {
        // 4. Generate Auto Invoice in Facture format (e.g. FAC-L421Z)
        const nextSequence = (await Invoice.count({ transaction })) + 1;
        const scrambledCode = crypto.encodeInvoiceId(nextSequence);
        invoiceNumber = `FAC-${scrambledCode}`;
        const now = new Date();
        invoice = await Invoice.create({
          SaleId: sale.id,
          ShopId: shopId,
          UserId: userId,
          invoice_number: invoiceNumber,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          tax_type: processedItems[0]?.taxType === 'TVA' ? 'TVA' : 'NTVA',
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
      } else {
        // Audit Log for pending partner sale
        await AuditService.log({
          userId,
          shopId,
          actionType: 'SALE_PENDING_APPROVAL',
          tableName: 'Sales',
          newValues: { saleId: sale.id, customerId: saleData.CustomerId, totalAmount }
        });
      }

      await transaction.commit();
      return { sale, invoice, isPartner: requiresApproval };
    } catch (error) {
      await transaction.rollback();
      console.error('🔥 POS Transaction Failed:', error.message);
      throw error;
    }
  };

  exports.cancelSale = async (saleId, userId, reason, req = null) => {
    const sale = await Sale.findByPk(saleId);
    if (!sale) throw new Error('Sale not found');
    if (sale.status === 'CANCELLED') return sale;

    sale.status = 'CANCELLED';
    sale.cancel_reason = reason;
    await sale.save();

    await AuditService.log({
      userId,
      shopId: sale.ShopId,
      actionType: 'SALE_CANCEL',
      tableName: 'Sales',
      oldValues: { status: 'COMPLETED' },
      newValues: { status: 'CANCELLED', reason }
    });
    return sale;
  };
// --- CONTROLLER LOGIC ---

const ApiResponse = require('../utils/response');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { Op } = require('sequelize');


  exports.getAll = async (req, res, next) => {
    try {
      const { shop_id, range, limit = 200 } = req.query;

      // Build date range filter
      const where = {};
      
      // Strict multi-tenancy filter: Only see sales belonging to this warehouse/shop
      if (req.shopId) {
        where.ShopId = req.shopId;
      } else if (shop_id) {
        where.ShopId = shop_id;
      }

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
          { model: SaleItem, include: [{ model: Product, required: false }] },
          { model: Invoice, required: false, attributes: ['invoice_number'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit, 10)
      });
      return ApiResponse.success(res, sales);
    } catch (error) {
      next(error);
    }
  }

  exports.getById = async (req, res, next) => {
    try {
      const sale = await Sale.findByPk(req.params.id, {
        include: [
          { model: Customer },
          { model: SaleItem, include: [{ model: Product }] },
          { model: Invoice, attributes: ['invoice_number'] }
        ]
      });
      if (!sale) return ApiResponse.error(res, 'Sale not found', 404);
      return ApiResponse.success(res, sale);
    } catch (error) {
      next(error);
    }
  }

  exports.create = async (req, res, next) => {
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
      
      const sale = await exports.createSale({ ...saleData, idempotency_key: key }, items, req.user.id, req);
      return ApiResponse.success(res, sale, 'Sale created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  exports.cancel = async (req, res, next) => {
    try {
      const { reason } = req.body;
      const sale = await exports.cancelSale(req.params.id, req.user.id, reason, req);
      return ApiResponse.success(res, sale, 'Sale cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  exports.approveSale = async (saleId, userId, req = null) => {
    const transaction = await sequelize.transaction();
    try {
      const sale = await Sale.findByPk(saleId, {
        include: [{ model: SaleItem }],
        transaction
      });
      if (!sale) throw new Error('Sale not found');
      if (sale.status !== 'PENDING_APPROVAL') {
        throw new Error('Only pending approval sales can be approved');
      }

      sale.status = 'COMPLETED';
      await sale.save({ transaction });

      // Generate Auto Invoice in Facture format
      const nextSequence = (await Invoice.count({ transaction })) + 1;
      const scrambledCode = crypto.encodeInvoiceId(nextSequence);
      const invoiceNumber = `FAC-${scrambledCode}`;
      const now = new Date();
      const invoice = await Invoice.create({
        SaleId: sale.id,
        ShopId: sale.ShopId,
        UserId: sale.UserId,
        invoice_number: invoiceNumber,
        subtotal: sale.subtotal,
        tax_amount: sale.tax_amount,
        total_amount: sale.total_amount,
        tax_type: sale.tax_type,
        status: 'GENERATED',
        createdAt: now,
        updatedAt: now
      }, { transaction });

      // Update Shop Financials
      await FinancialService.recordSale(sale.ShopId, Number(sale.total_amount), Number(sale.tax_amount), sale.tax_type);

      // Audit Log for approval
      await AuditService.log({
        userId,
        shopId: sale.ShopId,
        actionType: 'SALE_APPROVE',
        tableName: 'Sales',
        oldValues: { status: 'PENDING_APPROVAL' },
        newValues: { status: 'COMPLETED', saleId: sale.id, invoiceNumber }
      });

      await transaction.commit();
      return { sale, invoice };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  exports.rejectSale = async (saleId, userId, reason, req = null) => {
    const transaction = await sequelize.transaction();
    try {
      const sale = await Sale.findByPk(saleId, {
        include: [{ model: SaleItem }],
        transaction
      });
      if (!sale) throw new Error('Sale not found');
      if (sale.status !== 'PENDING_APPROVAL') {
        throw new Error('Only pending approval sales can be rejected');
      }

      sale.status = 'CANCELLED';
      sale.cancel_reason = reason || 'Rejected by Owner';
      await sale.save({ transaction });

      // Restore Stock
      for (const item of sale.SaleItems) {
        const stock = await Stock.findOne({
          where: { ProductId: item.ProductId, ShopId: sale.ShopId },
          transaction
        });
        if (stock) {
          stock.quantity = Number(stock.quantity) + Number(item.quantity);
          await stock.save({ transaction });
        }
      }

      // Audit Log for rejection
      await AuditService.log({
        userId,
        shopId: sale.ShopId,
        actionType: 'SALE_REJECT',
        tableName: 'Sales',
        oldValues: { status: 'PENDING_APPROVAL' },
        newValues: { status: 'CANCELLED', reason }
      });

      await transaction.commit();
      return sale;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  exports.getPendingApproval = async (req, res, next) => {
    try {
      const where = { status: 'PENDING_APPROVAL' };
      if (req.shopId) where.ShopId = req.shopId;

      const sales = await Sale.findAll({
        where,
        include: [
          { model: Customer, required: false },
          { model: User, required: false, attributes: ['id', 'full_name', 'email'] },
          { model: SaleItem, include: [{ model: Product, required: false }] }
        ],
        order: [['createdAt', 'DESC']]
      });
      return ApiResponse.success(res, sales);
    } catch (error) {
      next(error);
    }
  }

  exports.approve = async (req, res, next) => {
    try {
      const result = await exports.approveSale(req.params.id, req.user.id, req);
      return ApiResponse.success(res, result, 'Sale approved successfully');
    } catch (error) {
      next(error);
    }
  }

  exports.reject = async (req, res, next) => {
    try {
      const { reason } = req.body;
      const sale = await exports.rejectSale(req.params.id, req.user.id, reason, req);
      return ApiResponse.success(res, sale, 'Sale rejected successfully');
    } catch (error) {
      next(error);
    }
  }




