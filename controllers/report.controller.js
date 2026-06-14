
// --- SERVICE LOGIC INLINED ---
const { sequelize } = require('../config/database');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const CashSession = require('../models/CashSession');
const Shop = require('../models/Shop');
const DailyReport = require('../models/DailyReport');
const AuditService = require('../utils/audit');
const { Op, fn, col, literal } = require('sequelize');

const ReportService = {
  /**
   * GET /reports/daily — Sales summary for a given date
   */
  _normalizeDecimal(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  },

  _buildHourlyBreakdown(rows = []) {
    const hours = Array.from({ length: 24 }, (_, index) => ({ hour: index, total: 0, count: 0 }));

    rows.forEach(row => {
      const hour = parseInt(row.hour, 10);
      if (Number.isNaN(hour) || hour < 0 || hour > 23) return;
      hours[hour] = {
        hour,
        total: this._normalizeDecimal(row.sales_total),
        count: parseInt(row.sale_count || 0, 10)
      };
    });

    const hourlySales = hours.map(h => ({ hour: h.hour, total: h.total }));
    const hourlyTransactions = hours.map(h => ({ hour: h.hour, count: h.count }));
    const peakHourRow = hours.reduce((winner, current) => current.total > winner.total ? current : winner, hours[0]);

    return {
      hourly_sales: hourlySales,
      hourly_transactions: hourlyTransactions,
      peak_hour: peakHourRow ? peakHourRow.hour : 0
    };
  },

  _buildInvoiceValidation(salesWithInvoices = []) {
    const missingInvoices = [];
    const amountMismatches = [];
    const invalidInvoices = [];
    const statusCounts = {};

    salesWithInvoices.forEach(sale => {
      const saleTotal = this._normalizeDecimal(sale.total_amount);
      const saleTax = this._normalizeDecimal(sale.tax_amount);

      if (!sale.Invoice) {
        missingInvoices.push({
          sale_id: sale.id,
          shop_id: sale.ShopId,
          user_id: sale.UserId,
          sale_total: saleTotal,
          sale_tax: saleTax,
          created_at: sale.createdAt
        });
        return;
      }

      const invoice = sale.Invoice;
      const invoiceTotal = this._normalizeDecimal(invoice.total_amount);
      const invoiceTax = this._normalizeDecimal(invoice.tax_amount);
      statusCounts[invoice.status] = (statusCounts[invoice.status] || 0) + 1;

      if (!invoice.invoice_number || String(invoice.invoice_number).trim() === '') {
        invalidInvoices.push({
          invoice_id: invoice.id,
          sale_id: sale.id,
          reason: 'Missing invoice number',
          status: invoice.status
        });
      } if (Math.abs(saleTotal - invoiceTotal) > 0.009 || Math.abs(saleTax - invoiceTax) > 0.009) {
        amountMismatches.push({
          invoice_id: invoice.id,
          sale_id: sale.id,
          sale_total: saleTotal,
          invoice_total: invoiceTotal,
          sale_tax: saleTax,
          invoice_tax: invoiceTax,
          difference: parseFloat((invoiceTotal - saleTotal).toFixed(2)),
          status: invoice.status
        });
      }
    });

    return {
      total_invoices: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      status_summary: statusCounts,
      missing_invoices: missingInvoices,
      invoice_mismatches: amountMismatches,
      invalid_invoices: invalidInvoices,
      missing_count: missingInvoices.length,
      mismatch_count: amountMismatches.length,
      invalid_count: invalidInvoices.length,
      consistency_check: missingInvoices.length === 0 && amountMismatches.length === 0 && invalidInvoices.length === 0
    };
  },

  async _persistDailyReport(report) {
    const payload = {
      ShopId: report.shopId ?? null,
      report_date: report.date,
      generated_at: new Date(),
      total_sales: report.total_sales,
      total_expenses: report.total_expenses,
      net_profit: report.net_profit,
      total_tax: report.total_tax,
      total_cogs: report.total_cogs,
      sale_count: report.sale_count,
      payment_summary: report.payment_summary,
      cashier_breakdown: report.cashier_breakdown,
      top_items: report.top_products
    };

    const where = {
      report_date: report.date,
      ShopId: report.shopId ?? null
    };

    const existingReports = await DailyReport.findAll({ where });
    if (existingReports.length > 0) {
      const [primaryReport, ...duplicates] = existingReports;
      if (duplicates.length > 0) {
        await Promise.all(duplicates.map(duplicate => duplicate.destroy()));
      }
      const updatedReport = await primaryReport.update(payload);
      AuditService.log({
        userId: null,
        shopId: payload.ShopId,
        actionType: 'DAILY_REPORT_GENERATED',
        tableName: 'DailyReports',
        newValues: { report_date: payload.report_date, ShopId: payload.ShopId }
      });
      return updatedReport;
    }

    const createdReport = await DailyReport.create(payload);
    AuditService.log({
      userId: null,
      shopId: payload.ShopId,
      actionType: 'DAILY_REPORT_GENERATED',
      tableName: 'DailyReports',
      newValues: { report_date: payload.report_date, ShopId: payload.ShopId }
    });
    return createdReport;
  },

  async daily(date, shopId = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const start = `${targetDate} 00:00:00`;
    const end = `${targetDate} 23:59:59`;

    const whereSale = {
      status: 'COMPLETED',
      createdAt: { [Op.between]: [start, end] }
    };
    if (shopId) whereSale.ShopId = shopId;

    const whereExpense = {
      date: { [Op.between]: [start, end] }
    };
    if (shopId) whereExpense.ShopId = shopId;

    const [totals, paymentMethods, cashierRows, topItems, totalExpenses, cogsRow, hourlyRows, salesWithInvoices, sessionsOpened, sessionsClosed, activeSessions] = await Promise.all([
      Sale.findOne({
        attributes: [
          [fn('COUNT', col('id')), 'sale_count'],
          [fn('SUM', col('total_amount')), 'total_sales'],
          [fn('SUM', col('tax_amount')), 'total_tax'],
          [fn('SUM', literal("CASE WHEN tax_type = 'TVA' THEN tax_amount ELSE 0 END")), 'total_tva'],
          [fn('SUM', literal("CASE WHEN tax_type = 'NTVA' THEN tax_amount ELSE 0 END")), 'total_ntva']
        ],
        where: whereSale,
        raw: true
      }),
      Sale.findAll({
        attributes: [
          'paymentMethod',
          [fn('COUNT', col('id')), 'payment_count'],
          [fn('SUM', col('total_amount')), 'payment_total']
        ],
        where: whereSale,
        group: ['paymentMethod'],
        raw: true
      }),
      Sale.findAll({
        attributes: [
          'UserId',
          [fn('COUNT', col('Sale.id')), 'sale_count'],
          [fn('SUM', col('total_amount')), 'total_revenue']
        ],
        include: [{ model: User, attributes: ['id', 'full_name', 'role'] }],
        where: whereSale,
        group: ['UserId', 'User.id', 'User.full_name', 'User.role'],
        raw: false,
        subQuery: false
      }),
      SaleItem.findAll({
        attributes: [
          'ProductId',
          [fn('SUM', col('SaleItem.quantity')), 'quantity_sold'],
          [fn('SUM', col('SaleItem.subTotal')), 'revenue']
        ],
        include: [
          { model: Product, attributes: ['id', 'name'] },
          { model: Sale, attributes: [], where: whereSale }
        ],
        group: ['ProductId', 'Product.id', 'Product.name'],
        order: [[fn('SUM', col('SaleItem.quantity')), 'DESC']],
        limit: 5,
        raw: false,
        subQuery: false
      }),
      Expense.sum('amount', { where: whereExpense }),
      SaleItem.findOne({
        attributes: [[literal('SUM(quantity * unitCostSnapshot)'), 'total_cogs']],
        include: [{ model: Sale, attributes: [], where: whereSale }],
        raw: true,
        subQuery: false
      }),
      Sale.findAll({
        attributes: [
          [fn('HOUR', col('createdAt')), 'hour'],
          [fn('COUNT', col('id')), 'sale_count'],
          [fn('SUM', col('total_amount')), 'sales_total']
        ],
        where: whereSale,
        group: [fn('HOUR', col('createdAt'))],
        order: [[literal('hour'), 'ASC']],
        raw: true
      }),
      Sale.findAll({
        attributes: ['id', 'total_amount', 'tax_amount', 'UserId', 'ShopId', 'createdAt'],
        where: whereSale,
        include: [{ model: Invoice, attributes: ['id', 'total_amount', 'tax_amount', 'status', 'invoice_number'], required: false }],
        raw: false,
        subQuery: false
      }),
      CashSession.count({ where: { opened_at: { [Op.between]: [start, end] }, ...(shopId ? { ShopId: shopId } : {}) } }),
      CashSession.count({ where: { closed_at: { [Op.between]: [start, end] }, ...(shopId ? { ShopId: shopId } : {}) } }),
      CashSession.count({ where: { status: 'open', ...(shopId ? { ShopId: shopId } : {}) } })
    ]);

    const totalsRow = totals || {};
    const totalSales = this._normalizeDecimal(totalsRow.total_sales);
    const totalTax = this._normalizeDecimal(totalsRow.total_tax);
    const totalExpensesValue = this._normalizeDecimal(totalExpenses);
    const totalCogs = this._normalizeDecimal(cogsRow?.total_cogs);

    const paymentSummary = {
      CASH: 0,
      MOBILE_MONEY: 0,
      CREDIT: 0
    };
    paymentMethods.forEach(row => {
      paymentSummary[row.paymentMethod] = this._normalizeDecimal(row.payment_total);
    });

    const cashierBreakdown = cashierRows.map(row => ({
      cashier_id: row.User?.id || row.UserId,
      cashier_name: row.User?.full_name || null,
      total_sales: this._normalizeDecimal(row.get('total_revenue')),
      transactions: parseInt(row.get('sale_count') || 0, 10)
    }));

    const topProducts = topItems.map(item => ({
      product_id: item.Product?.id || item.ProductId,
      name: item.Product?.name || null,
      quantity: this._normalizeDecimal(item.get('quantity_sold')),
      revenue: this._normalizeDecimal(item.get('revenue'))
    }));

    const hourlyData = this._buildHourlyBreakdown(hourlyRows);
    const invoiceValidation = this._buildInvoiceValidation(salesWithInvoices);

    const report = {
      shopId: shopId || null,
      date: targetDate,
      sale_count: parseInt(totalsRow.sale_count || 0, 10),
      total_sales: totalSales,
      total_tax: totalTax,
      total_expenses: totalExpensesValue,
      net_profit: totalSales - totalExpensesValue,
      hourly_sales: hourlyData.hourly_sales,
      hourly_transactions: hourlyData.hourly_transactions,
      peak_hour: hourlyData.peak_hour,
      payment_summary: paymentSummary,
      cashier_breakdown: cashierBreakdown,
      invoice_summary: {
        total_invoices: invoiceValidation.total_invoices,
        consistency_check: invoiceValidation.consistency_check,
        missing_invoices: invoiceValidation.missing_count,
        mismatch_count: invoiceValidation.mismatch_count
      },
      top_products: topProducts,
      cash_sessions: {
        opened: sessionsOpened,
        closed: sessionsClosed,
        active: activeSessions
      },
      total_cogs: totalCogs,
      gross_profit: totalSales - totalCogs
    };

    await this._persistDailyReport(report);
    return report;
  },

  async generateDailyReportsForDate(date, shopId = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (shopId) {
      const report = await this.daily(targetDate, shopId);
      return { shop_id: shopId, report_date: targetDate, report };
    }

    const globalReport = await this.daily(targetDate, null);
    const shops = await Shop.findAll({ attributes: ['id'] });
    const shopReports = [];

    for (const shop of shops) {
      shopReports.push({ shop_id: shop.id, report: await this.daily(targetDate, shop.id) });
    }

    return {
      report_date: targetDate,
      generated_at: new Date(),
      global_report: globalReport,
      shop_reports: shopReports
    };
  },

  async generateDailyReportsForPreviousDay() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = yesterday.toISOString().split('T')[0];
    return this.generateDailyReportsForDate(targetDate);
  },

  /**
   * GET /reports/monthly — Sales summary for a given month
   */
  async monthly(year, month, shopId = null) {
    const y = year  || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;
    const paddedMonth = String(m).padStart(2, '0');

    const start = `${y}-${paddedMonth}-01 00:00:00`;
    const end   = `${y}-${paddedMonth}-31 23:59:59`;

    const where = {
      status: 'COMPLETED',
      createdAt: { [Op.between]: [start, end] }
    };
    if (shopId) where.ShopId = shopId;

    const rows = await Sale.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'sale_date'],
        [fn('SUM', col('total_amount')), 'total_sales'],
        [fn('COUNT', col('id')), 'sale_count']
      ],
      where,
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']],
      raw: true
    });

    const totalRevenue  = rows.reduce((sum, r) => sum + parseFloat(r.total_sales), 0);
    const totalCount    = rows.reduce((sum, r) => sum + parseInt(r.sale_count), 0);

    return { year: y, month: m, total_revenue: totalRevenue, total_count: totalCount, daily_breakdown: rows };
  },

  /**
   * GET /reports/top-products — Best-selling products
   */
  async topProducts(limit = 10, startDate, endDate, shopId = null) {
    const whereSale = { status: 'COMPLETED' };
    if (startDate && endDate) {
      whereSale.createdAt = { [Op.between]: [startDate, endDate] };
    } if (shopId) whereSale.ShopId = shopId;

    const items = await SaleItem.findAll({
      attributes: [
        'ProductId',
        [fn('SUM', col('SaleItem.quantity')), 'total_sold'],
        [fn('SUM', col('SaleItem.subTotal')), 'total_revenue']
      ],
      include: [
        { model: Product, attributes: ['id', 'name'] },
        { model: Sale, attributes: [], where: whereSale }
      ],
      group: ['ProductId', 'Product.id', 'Product.name'],
      order: [[fn('SUM', col('SaleItem.quantity')), 'DESC']],
      limit: parseInt(limit),
      raw: false,
      subQuery: false
    });

    return items;
  },

  async inventoryReport(startDate, endDate, shopId = null) {
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    const whereSale = {
      status: 'COMPLETED',
      createdAt: { [Op.between]: [`${start} 00:00:00`, `${end} 23:59:59`] }
    };
    if (shopId) whereSale.ShopId = shopId;

    const stockRows = await Stock.findAll({
      where: shopId ? { ShopId: shopId } : {},
      attributes: ['ProductId', 'quantity'],
      raw: true
    });
    const stockByProduct = new Map(stockRows.map(s => [s.ProductId, Number(s.quantity)]));

    const items = await SaleItem.findAll({
      attributes: [
        'ProductId',
        [fn('SUM', col('SaleItem.quantity')), 'quantity_sold'],
        [fn('SUM', col('SaleItem.subTotal')), 'total_revenue'],
        [fn('SUM', literal('quantity * unitCostSnapshot')), 'total_cost'],
        [fn('SUM', literal('(unitPrice - unitCostSnapshot) * quantity')), 'gross_profit'],
        [fn('SUM', literal("CASE WHEN priceType = 'RETAIL' THEN quantity ELSE 0 END")), 'retail_qty'],
        [fn('SUM', literal("CASE WHEN priceType = 'PARTNER' THEN quantity ELSE 0 END")), 'partner_qty'],
        [fn('SUM', literal("CASE WHEN priceType = 'WHOLESALE' THEN quantity ELSE 0 END")), 'wholesale_qty']
      ],
      include: [
        { model: Product, attributes: ['id', 'name', 'purchasePrice', 'sellingPrice', 'partnerPrice', 'wholesalePrice'] },
        { model: Sale, attributes: [], where: whereSale }
      ],
      group: [
        'ProductId',
        'Product.id',
        'Product.name',
        'Product.purchasePrice',
        'Product.sellingPrice',
        'Product.partnerPrice',
        'Product.wholesalePrice'
      ],
      order: [[fn('SUM', col('SaleItem.quantity')), 'DESC']],
      raw: false,
      subQuery: false
    });

    const rows = items.map(item => {
      const qtySold = parseFloat(item.get('quantity_sold') || 0);
      const totalRevenue = parseFloat(item.get('total_revenue') || 0);
      const totalCost = parseFloat(item.get('total_cost') || 0);
      const grossProfit = parseFloat(item.get('gross_profit') || 0);
      const retailQty = parseFloat(item.get('retail_qty') || 0);
      const partnerQty = parseFloat(item.get('partner_qty') || 0);
      const wholesaleQty = parseFloat(item.get('wholesale_qty') || 0);

      const remainingQty = Number(stockByProduct.get(item.ProductId) || 0);
      // Compute quantity_entered as sold + remaining to ensure consistency
      const quantityEntered = qtySold + remainingQty;

      return {
        product_id: item.Product?.id || item.ProductId,
        product_name: item.Product?.name || 'Unknown Product',
        quantity_entered: quantityEntered,
        quantity_sold: qtySold,
        remaining_quantity: remainingQty,
        unit_buying_price: Number(item.Product?.purchasePrice || 0),
        unit_retail_price: Number(item.Product?.sellingPrice || 0),
        unit_partner_price: Number(item.Product?.partnerPrice || 0),
        unit_wholesale_price: Number(item.Product?.wholesalePrice || 0),
        total_revenue: totalRevenue,
        total_cost: totalCost,
        gross_profit: grossProfit,
        retail_qty: retailQty,
        partner_qty: partnerQty,
        wholesale_qty: wholesaleQty
      };
    });

    const availableColumns = [
      { key: 'product_name', label: 'Product Name' },
      { key: 'quantity_entered', label: 'Quantity Entered' },
      { key: 'quantity_sold', label: 'Quantity Sold' },
      { key: 'remaining_quantity', label: 'Remaining Quantity' },
      { key: 'unit_buying_price', label: 'Unit Buying Price' },
      { key: 'unit_retail_price', label: 'Retail Price' },
      { key: 'unit_partner_price', label: 'Partner Price' },
      { key: 'unit_wholesale_price', label: 'Wholesale Price' },
      { key: 'total_revenue', label: 'Total Sales' },
      { key: 'total_cost', label: 'Total Cost' },
      { key: 'gross_profit', label: 'Gross Profit' },
      { key: 'retail_qty', label: 'Retail Qty' },
      { key: 'partner_qty', label: 'Partner Qty' },
      { key: 'wholesale_qty', label: 'Wholesale Qty' }
    ];

    return {
      start_date: start,
      end_date: end,
      availableColumns,
      rows
    };
  },

  /**
   * GET /reports/profit — Profit per date range
   */
  async profit(startDate, endDate, shopId = null) {
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const whereSale = {
      status: 'COMPLETED',
      createdAt: { [Op.between]: [`${start} 00:00:00`, `${end} 23:59:59`] }
    };
    if (shopId) whereSale.ShopId = shopId;

    const whereExpense = {
      date: { [Op.between]: [`${start} 00:00:00`, `${end} 23:59:59`] }
    };
    if (shopId) whereExpense.ShopId = shopId;

    const [salesItems, expenses] = await Promise.all([
      SaleItem.findAll({
        attributes: [
          'ProductId',
          [fn('SUM', col('SaleItem.quantity')), 'total_qty'],
          [fn('SUM', col('SaleItem.subTotal')), 'total_revenue'],
          [literal('SUM(quantity * unitCostSnapshot)'), 'total_cost']
        ],
        include: [
          { model: Product, attributes: ['name'] },
          {
            model: Sale,
            attributes: [],
            where: whereSale
          }
        ],
        group: ['ProductId', 'Product.id', 'Product.name'],
        raw: false,
        subQuery: false
      }),
      Expense.findAll({
        where: whereExpense
      })
    ]);

    const grossRevenue = salesItems.reduce((sum, item) => sum + parseFloat(item.get('total_revenue') || 0), 0);
    const costOfGoods = salesItems.reduce((sum, item) => sum + parseFloat(item.get('total_cost') || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const grossProfit = grossRevenue - costOfGoods;
    const netProfit = grossProfit - totalExpenses;

    return {
      period: { start, end },
      gross_revenue: grossRevenue,
      cost_of_goods: costOfGoods,
      gross_profit: grossProfit,
      total_expenses: totalExpenses,
      net_profit: netProfit
    };
  },

  /**
   * GET /reports/stock-alerts — Products below minimum stock
   */
  async stockAlerts(shopId = null) {
    const whereStock = {
      quantity: { [Op.lt]: 10 }
    };
    if (shopId) whereStock.ShopId = shopId;

    const products = await Product.findAll({
      include: [{
        model: Stock,
        where: whereStock,
        required: true
      }],
      attributes: ['id', 'name', 'purchasePrice'],
      order: [[Stock, 'quantity', 'ASC']]
    });
    return products;
  },

  /**
   * GET /reports/employee-sales — Sales per cashier/employee
   */
  async employeeSales(startDate, endDate, shopId = null) {
    const start = startDate || new Date().toISOString().split('T')[0];
    const end   = endDate   || new Date().toISOString().split('T')[0];

    const where = {
      status: 'COMPLETED',
      createdAt: { [Op.between]: [`${start} 00:00:00`, `${end} 23:59:59`] }
    };
    if (shopId) where.ShopId = shopId;

    const rows = await Sale.findAll({
      attributes: [
        'UserId',
        [fn('COUNT', col('Sale.id')), 'total_sales'],
        [fn('SUM', col('total_amount')), 'total_revenue']
      ],
      include: [
        { model: User, attributes: ['id', 'full_name', 'role'] }
      ],
      where,
      group: ['UserId', 'User.id', 'User.full_name', 'User.role'],
      order: [[fn('SUM', col('total_amount')), 'DESC']],
      raw: false,
      subQuery: false
    });

    return rows;
  },

  /**
   * GET /reports/owner/global — Global per-shop aggregates for a date
   */
  async ownerGlobal(date) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const start = `${targetDate} 00:00:00`;
    const end = `${targetDate} 23:59:59`;

    const whereSale = { status: 'COMPLETED', createdAt: { [Op.between]: [start, end] } };
    const whereExpense = { date: { [Op.between]: [start, end] } };

    const [salesByShop, expensesByShop] = await Promise.all([
      Sale.findAll({
        attributes: [
          'ShopId',
          [fn('SUM', col('total_amount')), 'total_sales'],
          [fn('COUNT', col('id')), 'sale_count']
        ],
        where: whereSale,
        group: ['ShopId'],
        raw: true
      }),
      Expense.findAll({
        attributes: ['ShopId', [fn('SUM', col('amount')), 'total_expenses']],
        where: whereExpense,
        group: ['ShopId'],
        raw: true
      })
    ]);

    // merge by ShopId
    const map = new Map();
    salesByShop.forEach(s => map.set(s.ShopId, { ShopId: s.ShopId, total_sales: parseFloat(s.total_sales || 0), sale_count: parseInt(s.sale_count || 0, 10), total_expenses: 0 }));
    expensesByShop.forEach(e => {
      const rec = map.get(e.ShopId) || { ShopId: e.ShopId, total_sales: 0, sale_count: 0, total_expenses: 0 };
      rec.total_expenses = parseFloat(e.total_expenses || e.total_expenses || 0) || parseFloat(e.total_expenses || 0);
      map.set(e.ShopId, rec);
    });

    return Array.from(map.values()).map(r => ({
      ...r,
      net_profit: r.total_sales - r.total_expenses
    }));
  },

  /**
   * GET /reports/cashier/performance — performance for a cashier or current user
   */
  async cashierPerformance({ userId = null, startDate = null, endDate = null, shopId = null }) {
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const where = {
      status: 'COMPLETED',
      createdAt: { [Op.between]: [`${start} 00:00:00`, `${end} 23:59:59`] }
    };
    if (shopId) where.ShopId = shopId;
    if (userId) where.UserId = userId;

    const rows = await Sale.findAll({
      attributes: [
        'UserId',
        [fn('COUNT', col('id')), 'transaction_count'],
        [fn('SUM', col('total_amount')), 'total_sales']
      ],
      include: [{ model: User, attributes: ['id', 'full_name'] }],
      where,
      group: ['UserId', 'User.id', 'User.full_name'],
      raw: false,
      subQuery: false
    });

    return rows.map(r => ({
      user_id: r.User?.id || r.UserId,
      full_name: r.User?.full_name || null,
      transaction_count: parseInt(r.get('transaction_count') || 0, 10),
      total_sales: parseFloat(r.get('total_sales') || 0)
    }));
  }
};




// --- CONTROLLER LOGIC ---

const ApiResponse = require('../utils/response');


  exports.daily = async (req, res, next) => {
    try {
      const { date } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.daily(date, shopId);
      return ApiResponse.success(res, data, 'Daily report');
    } catch (error) {
      next(error);
    }
  }

  exports.triggerDaily = async (req, res, next) => {
    try {
      const { date } = req.body;
      const shopId = req.shopId || null;
      const data = await ReportService.generateDailyReportsForDate(date, shopId);
      return ApiResponse.success(res, data, 'Daily report generation triggered');
    } catch (error) {
      next(error);
    }
  }

  exports.monthly = async (req, res, next) => {
    try {
      const { year, month } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.monthly(year, month, shopId);
      return ApiResponse.success(res, data, 'Monthly report');
    } catch (error) {
      next(error);
    }
  }

  exports.topProducts = async (req, res, next) => {
    try {
      const { limit, start_date, end_date } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.topProducts(limit, start_date, end_date, shopId);
      return ApiResponse.success(res, data, 'Top products report');
    } catch (error) {
      next(error);
    }
  }

  exports.profit = async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.profit(start_date, end_date, shopId);
      return ApiResponse.success(res, data, 'Profit report');
    } catch (error) {
      next(error);
    }
  }

  exports.inventory = async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.inventoryReport(start_date, end_date, shopId);
      return ApiResponse.success(res, data, 'Inventory report');
    } catch (error) {
      next(error);
    }
  }

  exports.stockAlerts = async (req, res, next) => {
    try {
      const shopId = req.shopId || null;
      const data = await ReportService.stockAlerts(shopId);
      return ApiResponse.success(res, data, 'Stock alerts report');
    } catch (error) {
      next(error);
    }
  }

  exports.employeeSales = async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query;
      const shopId = req.shopId || null;
      const data = await ReportService.employeeSales(start_date, end_date, shopId);
      return ApiResponse.success(res, data, 'Employee performance report');
    } catch (error) {
      next(error);
    }
  }

  exports.ownerGlobal = async (req, res, next) => {
    try {
      const { date } = req.query;
      // only owners should call this (enforced in routes)
      const data = await ReportService.ownerGlobal(date);
      return ApiResponse.success(res, data, 'Global per-shop report');
    } catch (error) {
      next(error);
    }
  }

  exports.cashierPerformance = async (req, res, next) => {
    try {
      const { start_date, end_date, user_id } = req.query;
      const shopId = req.shopId || null;
      // If cashier role, force user_id to current user
      const uid = req.user.role === 'cashier' ? req.user.id : user_id || null;
      const data = await ReportService.cashierPerformance({ userId: uid, startDate: start_date, endDate: end_date, shopId });
      return ApiResponse.success(res, data, 'Cashier performance report');
    } catch (error) {
      next(error);
    }
  }

  exports.auditLogs = async (req, res, next) => {
    try {
      const AuditLog = require('../models/AuditLog');
      const User = require('../models/User');
      const { shop_id, start_date, end_date } = req.query;
      
      const where = {};
      if (req.user.role !== 'owner') {
        where.shopId = req.user.ShopId;
      } else if (shop_id) {
        where.shopId = shop_id;
      }

      if (start_date && end_date) {
        const { Op } = require('sequelize');
        where.createdAt = {
          [Op.between]: [
            new Date(start_date + 'T00:00:00.000Z'),
            new Date(end_date + 'T23:59:59.999Z')
          ]
        };
      }

      const logs = await AuditLog.findAll({
        where,
        include: [{ model: User, attributes: ['full_name'] }],
        order: [['createdAt', 'DESC']],
        limit: 100
      });
      return ApiResponse.success(res, logs, 'Audit logs fetched');
    } catch (error) {
      next(error);
    }
  }




