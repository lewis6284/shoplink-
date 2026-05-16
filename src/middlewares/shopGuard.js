/**
 * ShopGuard Middleware
 * Enforces multi-tenant isolation (Shop isolation).
 * 
 * Logic:
 * 1. Cashier: Strict isolation to their assigned ShopId.
 * 2. Manager: Can access assigned shops (via UserShops or token ShopId).
 * 3. Owner: Global access, but can filter by a specific ShopId if provided in headers.
 */

const shopGuard = (req, res, next) => {
  const { user } = req;
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Get ShopId from request headers, body or query
  // The frontend may send X-Shop-Id, shop_id or ShopId.
  const requestedShopId = req.headers['x-shop-id'] || req.body?.ShopId || req.body?.shop_id || req.query?.ShopId || req.query?.shop_id;

  if (user.role === 'cashier') {
    if (!user.ShopId) {
      return res.status(403).json({ success: false, message: 'Cashier has no assigned shop' });
    }
    req.shopId = user.ShopId;
  } else if (user.role === 'manager') {
    if (!user.ShopId) {
      // Super Manager - can access any shop requested
      req.shopId = requestedShopId || null;
    } else {
      // Regular Manager - restricted to their shop
      if (requestedShopId && requestedShopId !== user.ShopId) {
        return res.status(403).json({ success: false, message: 'Managers cannot access other shop data' });
      }
      req.shopId = user.ShopId;
    }
  } else if (user.role === 'owner') {
    req.shopId = requestedShopId || null;
  } else {
    req.shopId = user.ShopId || null;
  }

  next();
};

module.exports = shopGuard;
