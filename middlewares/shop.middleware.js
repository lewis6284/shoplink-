const ApiResponse = require('../utils/response');

/**
 * Middleware to enforce shop-level data isolation
 */
const shopMiddleware = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Authentication required', 401);
  }

  const { role, ShopId } = req.user;

  // 1. Owners have global access
  if (role === 'owner') {
    // Allow them to specify a shop via header if they want to filter
    const requestedShopId = req.headers['x-shop-id'] || req.query.ShopId;
    if (requestedShopId) {
      req.shopId = requestedShopId;
    }
    return next();
  }

  // 2. Managers and Cashiers are strictly bound to their assigned ShopId
  if (!ShopId) {
    return ApiResponse.error(res, 'User is not assigned to any shop', 403);
  }

  req.shopId = ShopId;
  next();
};

module.exports = shopMiddleware;
