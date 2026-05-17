const ApiResponse = require('../utils/response');

/**
 * Tenant Middleware
 * Ensures that every request is isolated by ShopId
 */
const tenantMiddleware = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return ApiResponse.error(res, 'Authentication required', 401);
  }

  // 1. Hierarchical Tenancy Logic
  if (user.role === 'owner' || (user.role === 'manager' && !user.ShopId)) {
    // Owners and "Super Managers" (no fixed ShopId) can specify which shop they are viewing via Header
    const requestedShopId = req.headers['x-shop-id'];
    
    if (requestedShopId) {
      req.shopId = requestedShopId;
    } else {
      // If not specified, they see global data
      req.shopId = null;
    }
  } else {
    // Regular Managers and Cashiers are STUCK to their assigned shop
    if (!user.ShopId) {
      return ApiResponse.error(res, 'User is not assigned to any shop', 403);
    }
    req.shopId = user.ShopId;
  }

  next();
};

module.exports = tenantMiddleware;
