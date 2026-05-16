-- ==========================================
-- 1. PRODUCTS TABLE MIGRATION
-- ==========================================
ALTER TABLE Products 
  ADD COLUMN product_code VARCHAR(50) UNIQUE COMMENT 'Auto-generated sequence e.g., PRD-000001 (QR target)' AFTER id,
  ADD COLUMN ShopId CHAR(36) COMMENT 'NULL means Global product' AFTER id,
  ADD COLUMN unit_of_measure CHAR(36) COMMENT 'Reference to Units table' AFTER barcode,
  ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER SupplierId;

-- Backfill product_code for existing data (Temporary UUID to ensure uniqueness during migration)
UPDATE Products SET product_code = CONCAT('LEGACY-', SUBSTRING(id, 1, 8)) WHERE product_code IS NULL;
ALTER TABLE Products MODIFY COLUMN product_code VARCHAR(50) NOT NULL UNIQUE;

-- Performance Indexes for Products
CREATE INDEX idx_products_lookup ON Products(product_code, barcode);
CREATE INDEX idx_products_tenant ON Products(ShopId, is_active);
CREATE INDEX idx_products_search ON Products(name);
ALTER TABLE Products ADD CONSTRAINT fk_products_shop FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE;
ALTER TABLE Products ADD CONSTRAINT fk_products_uom FOREIGN KEY (unit_of_measure) REFERENCES units(id) ON DELETE SET NULL;


-- ==========================================
-- 2. PRODUCT IMAGES MIGRATION
-- ==========================================
ALTER TABLE product_images
  ADD COLUMN ShopId CHAR(36) AFTER ProductId,
  ADD COLUMN is_main TINYINT(1) DEFAULT 0 AFTER image_url,
  ADD COLUMN display_order INT DEFAULT 0 AFTER is_main;

-- Performance Indexes for Images
CREATE INDEX idx_pimg_product_main ON product_images(ProductId, is_main);
ALTER TABLE product_images ADD CONSTRAINT fk_pimg_shop FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE;


-- ==========================================
-- 3. PRODUCT PRICING RULES MIGRATION
-- ==========================================
ALTER TABLE ProductPricingRules
  ADD COLUMN ShopId CHAR(36) AFTER id,
  ADD COLUMN rule_type ENUM('FIXED_PRICE', 'DISCOUNT_PERCENT', 'DISCOUNT_AMOUNT') DEFAULT 'FIXED_PRICE' AFTER min_quantity,
  ADD COLUMN rule_value DECIMAL(15,2) DEFAULT 0 AFTER rule_type,
  ADD COLUMN priority INT DEFAULT 0 AFTER tax_type,
  ADD COLUMN start_date DATETIME AFTER priority,
  ADD COLUMN end_date DATETIME AFTER start_date;

-- Backfill rule_value based on existing price data
UPDATE ProductPricingRules SET rule_value = price WHERE price IS NOT NULL AND price > 0;
UPDATE ProductPricingRules SET rule_type = 'DISCOUNT_PERCENT', rule_value = discount_percentage WHERE discount_percentage IS NOT NULL AND discount_percentage > 0;

-- Performance Indexes for Pricing Engine
CREATE INDEX idx_pricing_engine ON ProductPricingRules(ProductId, ShopId, is_active, customer_type);
CREATE INDEX idx_pricing_dates ON ProductPricingRules(start_date, end_date);
ALTER TABLE ProductPricingRules ADD CONSTRAINT fk_pricingrule_shop FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE;
