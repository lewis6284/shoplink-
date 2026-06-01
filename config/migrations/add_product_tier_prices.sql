-- Add partner / wholesale tier prices to Products (run once on existing databases)
-- Table name uses shop_pwa_ prefix (see config/database.js afterDefine hook)
ALTER TABLE shop_pwa_products
  ADD COLUMN partnerPrice DECIMAL(15,2) NULL AFTER sellingPrice,
  ADD COLUMN wholesalePrice DECIMAL(15,2) NULL AFTER partnerPrice;

-- Or run: node migrate_product_tier_prices.js
