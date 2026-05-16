const ShopFinancial = require('../models/ShopFinancial');
const { sequelize } = require('../config/database');

/**
 * Financial Service
 * Maintains real-time shop financials.
 */
class FinancialService {
  /**
   * Update shop financials after a sale
   */
  static async recordSale(shopId, amount, taxAmount, taxType) {
    const [financial] = await ShopFinancial.findOrCreate({
      where: { ShopId: shopId },
      defaults: { total_sales: 0, total_expenses: 0, net_profit: 0 }
    });

    financial.total_sales = Number(financial.total_sales) + Number(amount);
    
    if (taxType === 'TVA') {
      financial.total_tva = Number(financial.total_tva) + Number(taxAmount);
    } else {
      financial.total_ntva = Number(financial.total_ntva) + Number(taxAmount);
    }

    financial.net_profit = Number(financial.total_sales) - Number(financial.total_expenses);
    await financial.save();
  }

  /**
   * Update shop financials after an expense
   */
  static async recordExpense(shopId, amount) {
    const [financial] = await ShopFinancial.findOrCreate({
      where: { ShopId: shopId },
      defaults: { total_sales: 0, total_expenses: 0, net_profit: 0 }
    });

    financial.total_expenses = Number(financial.total_expenses) + Number(amount);
    financial.net_profit = Number(financial.total_sales) - Number(financial.total_expenses);
    await financial.save();
  }
}

module.exports = FinancialService;
