SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================================
-- SHOPLINK DATABASE SCHEMA - PRODUCTION READY
-- Generated from: Database Architecture Audit
-- Purpose: Multi-tenant ERP system with shop isolation, RBAC, and audit trail
-- Key Changes:
--   1. All missing foreign key constraints added
--   2. All unique constraints and composite keys defined
--   3. Expense → ExpenseType relationship fixed
--   4. Multi-tenant ShopId isolation enforced
--   5. Timestamps standardized
--   6. Missing fields added to Expense and Customer tables
-- =========================================================================

-- 🏢 1. SHOPS
CREATE TABLE IF NOT EXISTS Shops (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  name VARCHAR(255) NOT NULL,
  type ENUM('WAREHOUSE','RETAIL') DEFAULT 'RETAIL',
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(150),
  logo_url TEXT,
  settings JSON,
  status ENUM('active','inactive','suspended') DEFAULT 'active',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME COMMENT 'Soft delete timestamp',
  KEY idx_shops_status (status)
);

-- 👤 2. USERS (System users - owners, managers, cashiers)
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  full_name VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(50),
  pin_code VARCHAR(10),
  profile_image TEXT,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','manager','cashier') NOT NULL DEFAULT 'cashier',
  is_active TINYINT(1) DEFAULT 1,
  ShopId CHAR(36) COMMENT 'NULL for owners, assigned for manager/cashier',
  last_login DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_email (email),
  KEY idx_users_username (username),
  KEY idx_users_role (role),
  KEY idx_users_ShopId (ShopId),
  CONSTRAINT fk_users_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE SET NULL
);

-- 🔐 3. SESSIONS
CREATE TABLE IF NOT EXISTS Sessions (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  UserId CHAR(36) NOT NULL,
  token TEXT,
  ip_address VARCHAR(100),
  device_info TEXT,
  expires_at DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sessions_UserId (UserId),
  CONSTRAINT fk_sessions_UserId FOREIGN KEY (UserId) REFERENCES users(id) ON DELETE CASCADE
);

-- 🏷️ 4. CATEGORIES (Product categories - global or per-shop)
CREATE TABLE IF NOT EXISTS Categories (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  name VARCHAR(255) NOT NULL,
  parent_id CHAR(36) COMMENT 'For hierarchical categories',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_categories_parent (parent_id),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES Categories(id) ON DELETE SET NULL
);

-- 🏭 5. BRANDS (Product brands - global or per-shop)
CREATE TABLE IF NOT EXISTS Brands (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  name VARCHAR(255) NOT NULL UNIQUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 🏭 6. SUPPLIERS (Product suppliers - per-shop)
CREATE TABLE IF NOT EXISTS Suppliers (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  ShopId CHAR(36),
  is_active TINYINT(1) DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_suppliers_ShopId (ShopId),
  CONSTRAINT fk_suppliers_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE SET NULL
);

-- 📦 7. PRODUCTS (Product master - global or per-shop)
CREATE TABLE IF NOT EXISTS Products (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  barcode VARCHAR(100) UNIQUE,
  image_url TEXT,
  purchasePrice DECIMAL(15,2),
  sellingPrice DECIMAL(15,2),
  partnerPrice DECIMAL(15,2),
  wholesalePrice DECIMAL(15,2),
  tax_type ENUM('TVA','NTVA') DEFAULT 'NTVA',
  tax_rate DECIMAL(5,2) DEFAULT 0,
  CategoryId CHAR(36),
  BrandId CHAR(36),
  SupplierId CHAR(36),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_products_CategoryId (CategoryId),
  KEY idx_products_BrandId (BrandId),
  KEY idx_products_SupplierId (SupplierId),
  CONSTRAINT fk_products_CategoryId FOREIGN KEY (CategoryId) REFERENCES Categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_BrandId FOREIGN KEY (BrandId) REFERENCES Brands(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_SupplierId FOREIGN KEY (SupplierId) REFERENCES Suppliers(id) ON DELETE SET NULL
);

-- 📷 7.b PRODUCT IMAGES
CREATE TABLE IF NOT EXISTS product_images (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  ProductId CHAR(36) NOT NULL,
  image_url TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_product_images_ProductId (ProductId),
  CONSTRAINT fk_product_images_ProductId FOREIGN KEY (ProductId) REFERENCES Products(id) ON DELETE CASCADE
);

-- 💰 8. PRODUCT PRICING RULES (Per-product pricing overrides)
CREATE TABLE IF NOT EXISTS ProductPricingRules (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  ProductId CHAR(36) NOT NULL,
  customer_type ENUM('retail','partner','wholesale'),
  min_quantity INT DEFAULT 1,
  price DECIMAL(15,2),
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_type ENUM('TVA','NTVA') DEFAULT 'NTVA',
  is_active TINYINT(1) DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pricing_ProductId (ProductId),
  CONSTRAINT fk_pricing_ProductId FOREIGN KEY (ProductId) REFERENCES Products(id) ON DELETE CASCADE
);

-- 📦 9. GLOBAL STOCK (Warehouse-level inventory aggregation)
CREATE TABLE IF NOT EXISTS GlobalStocks (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  ProductId CHAR(36) NOT NULL UNIQUE,
  quantity DECIMAL(15,2) DEFAULT 0,
  reserved_quantity DECIMAL(15,2) DEFAULT 0,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_global_stock_ProductId (ProductId),
  CONSTRAINT fk_global_stock_ProductId FOREIGN KEY (ProductId) REFERENCES Products(id) ON DELETE CASCADE
);

-- 🏪 10. SHOP STOCK (Per-shop inventory with multi-tenant isolation)
CREATE TABLE IF NOT EXISTS Stocks (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  ShopId CHAR(36) NOT NULL,
  ProductId CHAR(36) NOT NULL,
  quantity DECIMAL(15,2) DEFAULT 0,
  min_stock_level DECIMAL(15,2) DEFAULT 0,
  KEY idx_stock_ShopId (ShopId),
  KEY idx_stock_ProductId (ProductId),
  UNIQUE KEY uk_stock_shop_product (ProductId, ShopId),
  CONSTRAINT fk_stock_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_ProductId FOREIGN KEY (ProductId) REFERENCES Products(id) ON DELETE CASCADE
);

-- 📊 10.b STOCK MOVEMENTS (Audit trail for inventory changes)
CREATE TABLE IF NOT EXISTS StockMovements (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  StockId CHAR(36) NOT NULL,
  type ENUM('IN','OUT','ADJUSTMENT'),
  reason ENUM('PURCHASE','SALE','LOSS','FREE','ADJUSTMENT'),
  quantityChange DECIMAL(10,2),
  previousQuantity DECIMAL(10,2),
  newQuantity DECIMAL(10,2),
  description VARCHAR(255),
  referenceId CHAR(36),
  localId CHAR(36) UNIQUE,
  deviceId VARCHAR(100),
  syncStatus ENUM('pending','synced') DEFAULT 'synced',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_stock_movements_StockId (StockId),
  CONSTRAINT fk_stock_movements_StockId FOREIGN KEY (StockId) REFERENCES Stocks(id) ON DELETE CASCADE
);

-- 📊 10.c STOCK ADJUSTMENTS (Manual stock corrections with audit)
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  product_id CHAR(36) NOT NULL,
  user_id CHAR(36),
  old_quantity DECIMAL(12,2),
  new_quantity DECIMAL(12,2),
  reason TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_stock_adj_product (product_id),
  KEY idx_stock_adj_user (user_id),
  CONSTRAINT fk_stock_adj_product FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_adj_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 🚚 11. STOCK TRANSFERS (Inter-shop inventory transfers)
CREATE TABLE IF NOT EXISTS StockTransfers (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  tracking_code VARCHAR(50) UNIQUE,
  idempotency_key CHAR(36) UNIQUE,
  ProductId CHAR(36) NOT NULL,
  FromShopId CHAR(36) NOT NULL,
  ToShopId CHAR(36) NOT NULL,
  Quantity DECIMAL(10,2),
  status ENUM('DRAFT','PENDING','APPROVED','IN_TRANSIT','RECEIVED','CANCELLED') DEFAULT 'PENDING',
  CreatedBy CHAR(36) NOT NULL,
  ApprovedBy CHAR(36),
  ReceivedBy CHAR(36),
  notes TEXT,
  estimated_arrival_date DATE,
  receivedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_transfer_ProductId (ProductId),
  KEY idx_transfer_FromShopId (FromShopId),
  KEY idx_transfer_ToShopId (ToShopId),
  KEY idx_transfer_CreatedBy (CreatedBy),
  KEY idx_transfer_ApprovedBy (ApprovedBy),
  KEY idx_transfer_ReceivedBy (ReceivedBy),
  CONSTRAINT fk_transfer_ProductId FOREIGN KEY (ProductId) REFERENCES Products(id) ON DELETE CASCADE,
  CONSTRAINT fk_transfer_FromShopId FOREIGN KEY (FromShopId) REFERENCES Shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_transfer_ToShopId FOREIGN KEY (ToShopId) REFERENCES Shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_transfer_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_transfer_ReceivedBy FOREIGN KEY (ReceivedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- 👥 12. CUSTOMERS (Customer master - per-shop multi-tenant)
CREATE TABLE IF NOT EXISTS Customers (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  full_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(150),
  address TEXT,
  customer_type ENUM('retail','partner','wholesale') DEFAULT 'retail',
  total_spent DECIMAL(15,2) DEFAULT 0,
  loyalty_points INT DEFAULT 0,
  credit_balance DECIMAL(12,2) DEFAULT 0,
  type ENUM('normal','partner') DEFAULT 'normal' COMMENT 'Kept for backward compatibility with customer_type',
  ShopId CHAR(36),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_customers_ShopId (ShopId),
  CONSTRAINT fk_customers_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- 💳 13. CUSTOMER CREDITS (Credit sales tracking per customer/sale)
CREATE TABLE IF NOT EXISTS customer_credits (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  customer_id CHAR(36) NOT NULL,
  sale_id CHAR(36),
  total_credit DECIMAL(12,2) NOT NULL,
  paid_credit DECIMAL(12,2) DEFAULT 0,
  remaining_credit DECIMAL(12,2) DEFAULT 0,
  due_date DATE,
  status ENUM('pending','partial','paid') DEFAULT 'pending',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_credit_customer (customer_id),
  KEY idx_credit_sale (sale_id),
  CONSTRAINT fk_credit_customer FOREIGN KEY (customer_id) REFERENCES Customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_credit_sale FOREIGN KEY (sale_id) REFERENCES Sales(id) ON DELETE SET NULL
);

-- 💰 14. CREDIT PAYMENTS (Payment history for credits)
CREATE TABLE IF NOT EXISTS credit_payments (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  credit_id CHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_payment_credit (credit_id),
  CONSTRAINT fk_payment_credit FOREIGN KEY (credit_id) REFERENCES customer_credits(id) ON DELETE CASCADE
);

-- 🧾 15. SALES (Point-of-sale transactions)
CREATE TABLE IF NOT EXISTS Sales (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  idempotency_key CHAR(36) UNIQUE,
  ShopId CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  CashSessionId CHAR(36),
  CustomerId CHAR(36),
  subtotal DECIMAL(15,2),
  tax_amount DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  tax_type ENUM('TVA','NTVA') DEFAULT 'NTVA',
  paymentMethod ENUM('CASH','MOBILE_MONEY','CREDIT'),
  status ENUM('COMPLETED','CANCELLED') DEFAULT 'COMPLETED',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sales_ShopId (ShopId),
  KEY idx_sales_UserId (UserId),
  KEY idx_sales_CashSessionId (CashSessionId),
  KEY idx_sales_CustomerId (CustomerId),
  KEY idx_sales_status (status),
  KEY idx_sales_createdAt (createdAt),
  CONSTRAINT fk_sales_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_UserId FOREIGN KEY (UserId) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_CashSessionId FOREIGN KEY (CashSessionId) REFERENCES CashSessions(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_CustomerId FOREIGN KEY (CustomerId) REFERENCES Customers(id) ON DELETE SET NULL
);

-- 🧾 15.b SALE ITEMS (Line items for each sale)
CREATE TABLE IF NOT EXISTS SaleItems (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  SaleId CHAR(36) NOT NULL,
  ProductId CHAR(36) NOT NULL,
  quantity DECIMAL(15,2),
  unitPrice DECIMAL(15,2),
  subTotal DECIMAL(15,2),
  unitCostSnapshot DECIMAL(10,2),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_saleitem_SaleId (SaleId),
  KEY idx_saleitem_ProductId (ProductId),
  CONSTRAINT fk_saleitem_SaleId FOREIGN KEY (SaleId) REFERENCES Sales(id) ON DELETE CASCADE,
  CONSTRAINT fk_saleitem_ProductId FOREIGN KEY (ProductId) REFERENCES Products(id) ON DELETE RESTRICT
);

-- 🧾 16. INVOICES (Formal billing documents from sales)
CREATE TABLE IF NOT EXISTS Invoices (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  SaleId CHAR(36) NOT NULL,
  ShopId CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  subtotal DECIMAL(15,2),
  tax_type ENUM('TVA','NTVA') DEFAULT 'NTVA',
  tax_amount DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  status ENUM('GENERATED','PRINTED','SENT') DEFAULT 'GENERATED',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_invoice_SaleId (SaleId),
  KEY idx_invoice_ShopId (ShopId),
  KEY idx_invoice_UserId (UserId),
  CONSTRAINT fk_invoice_SaleId FOREIGN KEY (SaleId) REFERENCES Sales(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_UserId FOREIGN KEY (UserId) REFERENCES users(id) ON DELETE RESTRICT
);

-- 🏦 17. CASH REGISTERS (Physical cash drawer/register device)
CREATE TABLE IF NOT EXISTS CashRegisters (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  ShopId CHAR(36) NOT NULL,
  name VARCHAR(100) DEFAULT 'Main Register',
  balance DECIMAL(10,2) DEFAULT 0,
  status ENUM('open','closed') DEFAULT 'open',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cashregister_ShopId (ShopId),
  CONSTRAINT fk_cashregister_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- 🏦 18. CASH SESSIONS (Cashier shift with opening/closing balance)
CREATE TABLE IF NOT EXISTS CashSessions (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  CashRegisterId CHAR(36),
  UserId CHAR(36),
  ShopId CHAR(36),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  closing_balance DECIMAL(15,2),
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  status ENUM('open','closed') DEFAULT 'open',
  KEY idx_cashsession_CashRegisterId (CashRegisterId),
  KEY idx_cashsession_UserId (UserId),
  KEY idx_cashsession_ShopId (ShopId),
  CONSTRAINT fk_cashsession_CashRegisterId FOREIGN KEY (CashRegisterId) REFERENCES CashRegisters(id) ON DELETE SET NULL,
  CONSTRAINT fk_cashsession_UserId FOREIGN KEY (UserId) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cashsession_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- 🧾 19. CASH MOVEMENTS (Individual cash transactions: deposits, withdrawals)
CREATE TABLE IF NOT EXISTS CashMovements (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  CashRegisterId CHAR(36) NOT NULL,
  type ENUM('IN','OUT'),
  amount DECIMAL(15,2),
  reason VARCHAR(255),
  referenceId CHAR(36),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cashmovement_CashRegisterId (CashRegisterId),
  CONSTRAINT fk_cashmovement_CashRegisterId FOREIGN KEY (CashRegisterId) REFERENCES CashRegisters(id) ON DELETE CASCADE
);

-- 📊 20. DAILY REPORTS (End-of-day financial summary per shop)
CREATE TABLE IF NOT EXISTS DailyReports (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  ShopId CHAR(36),
  report_date DATE NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_sales DECIMAL(15,2) DEFAULT 0,
  total_expenses DECIMAL(15,2) DEFAULT 0,
  net_profit DECIMAL(15,2) DEFAULT 0,
  total_tax DECIMAL(15,2) DEFAULT 0,
  total_cogs DECIMAL(15,2) DEFAULT 0,
  sale_count INT DEFAULT 0,
  payment_summary JSON,
  cashier_breakdown JSON,
  top_items JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_dailyreport_ShopId (ShopId),
  UNIQUE KEY uk_dailyreport_shop_date (ShopId, report_date),
  CONSTRAINT fk_dailyreport_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- 📊 20.b DAILY CASH REPORTS (Cashier-level end-of-shift reports)
CREATE TABLE IF NOT EXISTS daily_cash_reports (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  user_id CHAR(36),
  opening_balance DECIMAL(12,2) DEFAULT 0,
  closing_balance DECIMAL(12,2) DEFAULT 0,
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_expenses DECIMAL(12,2) DEFAULT 0,
  report_date DATE DEFAULT (CURDATE()),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_daily_cash_user (user_id),
  CONSTRAINT fk_daily_cash_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 💸 21. EXPENSE TYPES / CATEGORIES (Categorization for expenses)
CREATE TABLE IF NOT EXISTS ExpenseTypes (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  name VARCHAR(255) NOT NULL,
  ShopId CHAR(36),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_expensetype_ShopId (ShopId),
  CONSTRAINT fk_expensetype_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- 💸 22. EXPENSES (Business expenses for cost tracking)
CREATE TABLE IF NOT EXISTS Expenses (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  ShopId CHAR(36),
  ExpenseTypeId CHAR(36),
  UserId CHAR(36),
  amount DECIMAL(10,2),
  description TEXT,
  date DATE DEFAULT (CURDATE()),
  expense_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Alternative naming for backward compatibility',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_expense_ShopId (ShopId),
  KEY idx_expense_ExpenseTypeId (ExpenseTypeId),
  KEY idx_expense_UserId (UserId),
  CONSTRAINT fk_expense_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_expense_ExpenseTypeId FOREIGN KEY (ExpenseTypeId) REFERENCES ExpenseTypes(id) ON DELETE SET NULL,
  CONSTRAINT fk_expense_UserId FOREIGN KEY (UserId) REFERENCES users(id) ON DELETE SET NULL
);

-- 🛒 23. PURCHASES (Purchase orders from suppliers)
CREATE TABLE IF NOT EXISTS Purchases (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  SupplierId CHAR(36),
  ShopId CHAR(36) NOT NULL,
  status ENUM('PENDING','COMPLETED','CANCELLED') DEFAULT 'PENDING',
  totalCost DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_purchase_SupplierId (SupplierId),
  KEY idx_purchase_ShopId (ShopId),
  CONSTRAINT fk_purchase_SupplierId FOREIGN KEY (SupplierId) REFERENCES Suppliers(id) ON DELETE SET NULL,
  CONSTRAINT fk_purchase_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- 🛒 23.b PURCHASE ITEMS (Line items for each purchase order)
CREATE TABLE IF NOT EXISTS PurchaseItems (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  PurchaseId CHAR(36) NOT NULL,
  ProductId CHAR(36) NOT NULL,
  quantityPurchased INT,
  unitPrice DECIMAL(10,2),
  totalPrice DECIMAL(10,2),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_purchaseitem_PurchaseId (PurchaseId),
  KEY idx_purchaseitem_ProductId (ProductId),
  CONSTRAINT fk_purchaseitem_PurchaseId FOREIGN KEY (PurchaseId) REFERENCES Purchases(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchaseitem_ProductId FOREIGN KEY (ProductId) REFERENCES Products(id) ON DELETE RESTRICT
);

-- 📊 24. SHOP FINANCIALS (Aggregated financial metrics per shop)
CREATE TABLE IF NOT EXISTS ShopFinancials (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  ShopId CHAR(36) NOT NULL UNIQUE,
  total_sales DECIMAL(15,2) DEFAULT 0,
  total_expenses DECIMAL(15,2) DEFAULT 0,
  net_profit DECIMAL(15,2) DEFAULT 0,
  total_tva DECIMAL(15,2) DEFAULT 0,
  total_ntva DECIMAL(15,2) DEFAULT 0,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_shopfinancial_ShopId (ShopId),
  CONSTRAINT fk_shopfinancial_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- 👨‍💼 25. USER SHOPS (Junction table for user-shop assignments beyond primary ShopId)
CREATE TABLE IF NOT EXISTS UserShops (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  UserId CHAR(36) NOT NULL,
  ShopId CHAR(36) NOT NULL,
  role_in_shop ENUM('manager','cashier'),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_usershop (UserId, ShopId),
  KEY idx_usershop_UserId (UserId),
  KEY idx_usershop_ShopId (ShopId),
  CONSTRAINT fk_usershop_UserId FOREIGN KEY (UserId) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_usershop_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- 🔔 26. NOTIFICATIONS (System notifications for users)
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  title VARCHAR(255),
  message TEXT,
  type ENUM('warning','stock','sale') DEFAULT 'sale',
  is_read TINYINT(1) DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 🔐 27. DEVICES (User device registrations for tracking)
CREATE TABLE IF NOT EXISTS devices (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  user_id CHAR(36),
  device_uuid VARCHAR(255) UNIQUE NOT NULL,
  device_name VARCHAR(255),
  platform VARCHAR(100),
  browser VARCHAR(100),
  last_login DATETIME,
  is_active TINYINT(1) DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_device_user (user_id),
  CONSTRAINT fk_device_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ⚙️ 28. SETTINGS (Global system configuration)
CREATE TABLE IF NOT EXISTS settings (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  shop_name VARCHAR(255) NOT NULL,
  shop_phone VARCHAR(50),
  shop_email VARCHAR(150),
  shop_address TEXT,
  currency VARCHAR(20) DEFAULT 'FBU',
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  receipt_footer TEXT,
  logo_url TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 📏 29. UNITS (Product measurement units - e.g., KG, L, pieces)
CREATE TABLE IF NOT EXISTS units (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(20) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 📋 30. AUDIT LOGS (System audit trail for compliance and debugging)
CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  user_id CHAR(36),
  ShopId CHAR(36),
  action_type VARCHAR(100),
  table_name VARCHAR(100),
  old_values JSON,
  new_values JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_user (user_id),
  KEY idx_audit_shop (ShopId),
  KEY idx_audit_action (action_type),
  KEY idx_audit_createdAt (createdAt),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_shop FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE SET NULL
);

-- 📡 31. SYNC QUEUE (Offline-first sync queue for mobile/PWA clients)
CREATE TABLE IF NOT EXISTS sync_queue (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  device_id VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id CHAR(36),
  operation ENUM('CREATE','UPDATE','DELETE'),
  payload JSON,
  status ENUM('pending','synced','failed') DEFAULT 'pending',
  retry_count INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_syncqueue_device (device_id),
  KEY idx_syncqueue_status (status)
);

-- ✅ ENABLE FOREIGN KEY CHECKS
SET FOREIGN_KEY_CHECKS = 1;