/**
 * Pricing Engine
 * Calculates prices based on customer type and tax rules.
 */
class PricingEngine {
  /**
   * Calculate final price for a product based on customer context
   */
  static calculate(product, customerType = 'retail', quantity = 1) {
    let basePrice = product.sellingPrice;

    // Apply Pricing Rules if they exist (ProductPricingRules)
    // For simplicity, we check product properties first
    if (customerType === 'partner' && product.partnerPrice > 0) {
      basePrice = product.partnerPrice;
    } 
    else if (customerType === 'wholesale') {
      // Wholesale logic: use sellingPrice but can be overridden by specific rules
      basePrice = product.sellingPrice;
    }

    const subtotal = Number(basePrice) * quantity;
    let taxAmount = 0;

    // Apply Tax (TVA = 18%)
    if (product.tax_type === 'TVA') {
      const rate = Number(product.tax_rate) || 18;
      taxAmount = (subtotal * rate) / 100;
    }

    return {
      unitPrice: Number(basePrice),
      quantity,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
      taxType: product.tax_type || 'NTVA'
    };
  }
}

module.exports = PricingEngine;
