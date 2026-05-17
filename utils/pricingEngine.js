module.exports = {
  calculate(product, type, quantity) {
    const price = Number(product.sellingPrice) || 0;
    const qty = Number(quantity) || 1;
    return {
      unitPrice: price,
      subtotal: price * qty,
      taxAmount: 0,
      taxType: 'NTVA',
      total: price * qty
    };
  }
};
