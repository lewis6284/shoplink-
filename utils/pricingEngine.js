const ProductPricingRule = require('../models/ProductPricingRule');
const { Op } = require('sequelize');

module.exports = {
  /**
   * Asynchronously calculates correct unit price, tax, and totals
   * for a product based on customer tier, quantity, and shop.
   */
  async calculate(product, type, quantity, shopId = null) {
    const originalPrice = Number(product.sellingPrice) || 0;
    const qty = Number(quantity) || 1;
    let finalUnitPrice = originalPrice;
    let appliedRule = null;

    // 1. Search for active, applicable Pricing Rule
    const now = new Date();
    const rule = await ProductPricingRule.findOne({
      where: {
        ProductId: product.id,
        customer_type: type || 'retail',
        is_active: true,
        min_quantity: { [Op.lte]: qty },
        [Op.or]: [
          { ShopId: shopId },
          { ShopId: null }
        ],
        [Op.and]: [
          {
            [Op.or]: [
              { start_date: null },
              { start_date: { [Op.lte]: now } }
            ]
          },
          {
            [Op.or]: [
              { end_date: null },
              { end_date: { [Op.gte]: now } }
            ]
          }
        ]
      },
      order: [
        ['priority', 'DESC'],
        ['min_quantity', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    if (rule) {
      appliedRule = rule;
      if (rule.rule_type === 'FIXED_PRICE') {
        finalUnitPrice = Number(rule.rule_value);
      } else if (rule.rule_type === 'DISCOUNT_PERCENT') {
        finalUnitPrice = originalPrice * (1 - (Number(rule.rule_value) / 100));
      } else if (rule.rule_type === 'DISCOUNT_AMOUNT') {
        finalUnitPrice = Math.max(0, originalPrice - Number(rule.rule_value));
      }
    } else {
      // Static tier prices on the product (no dynamic rule)
      const tier = type || 'retail';
      if (tier === 'wholesale') {
        const wholesale = Number(product.wholesalePrice);
        if (wholesale > 0) finalUnitPrice = wholesale;
      } else if (tier === 'partner') {
        const partner = Number(product.partnerPrice);
        if (partner > 0) finalUnitPrice = partner;
      }
    }

    // 2. Calculate Exclusive Taxes
    const taxRate = Number(product.tax_rate || 0) / 100;
    let taxAmount = 0;

    if (product.tax_type === 'TVA') {
      taxAmount = finalUnitPrice * taxRate * qty;
    }

    const subtotal = finalUnitPrice * qty;

    return {
      unitPrice: finalUnitPrice,
      subtotal: subtotal,
      taxAmount: taxAmount,
      taxType: product.tax_type || 'HTVA',
      total: subtotal + taxAmount,
      appliedRule
    };
  }
};
