const PricingRule = require('../models/PricingRule');
const { Op } = require('sequelize');

class PricingEngineService {
  /**
   * Calculate the best price for a product given a customer and quantity
   */
  static async calculatePrice(product, quantity, customerType = 'retail', categoryId = null) {
    let finalPrice = Number(product.sellingPrice);

    // If partner, base price might be partnerPrice
    if (customerType === 'partner' && Number(product.partnerPrice) > 0) {
      finalPrice = Number(product.partnerPrice);
    }

    // Fetch active rules that match
    const rules = await PricingRule.findAll({
      where: {
        is_active: true,
        customer_type: customerType,
        [Op.or]: [
          { CategoryId: categoryId },
          { CategoryId: null }
        ],
        min_quantity: { [Op.lte]: quantity }
      },
      order: [['priority', 'DESC'], ['min_quantity', 'DESC']]
    });

    if (rules.length > 0) {
      const bestRule = rules[0];
      
      if (bestRule.fixed_price) {
        finalPrice = Number(bestRule.fixed_price);
      } else if (bestRule.discount_percentage > 0) {
        finalPrice = finalPrice * (1 - Number(bestRule.discount_percentage) / 100);
      }
    }

    return finalPrice;
  }
}

module.exports = PricingEngineService;
