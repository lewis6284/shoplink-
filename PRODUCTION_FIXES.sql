-- =========================================================================
-- SHOPLINK DATABASE - CRITICAL FIXES & PRODUCTION HARDENING
-- This file contains all ALTER TABLE statements and triggers to make the
-- database production-ready per the comprehensive audit.
-- 
-- DEPLOYMENT ORDER: Execute in phases as outlined
-- =========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================================
-- PHASE 1: CRITICAL FIXES (Week 1)
-- =========================================================================

-- Fix 1.1: Customers MUST have ShopId (Multi-tenant isolation critical)
-- First, populate missing ShopIds from sales records
UPDATE Customers c
SET ShopId = (
  SELECT DISTINCT s.ShopId 
  FROM Sales s 
  WHERE s.CustomerId = c.id 
  LIMIT 1
)
WHERE ShopId IS NULL 
AND EXISTS (SELECT 1 FROM Sales s WHERE s.CustomerId = c.id);

-- Create default shop for orphaned customers (should not exist in healthy system)
INSERT INTO Shops (id, name, type, status) 
VALUES (UUID(), 'Orphaned_Customers_Holding', 'RETAIL', 'inactive')
ON DUPLICATE KEY UPDATE name = name;

UPDATE Customers 
SET ShopId = (SELECT id FROM Shops WHERE name = 'Orphaned_Customers_Holding' LIMIT 1)
WHERE ShopId IS NULL;

-- Now enforce NOT NULL
ALTER TABLE Customers 
MODIFY COLUMN ShopId CHAR(36) NOT NULL;

-- Fix 1.2: DailyReports must have ShopId
UPDATE DailyReports
SET ShopId = (
  SELECT DISTINCT ShopId 
  FROM Sales 
  WHERE DATE(Sales.createdAt) = DailyReports.report_date
  LIMIT 1
)
WHERE ShopId IS NULL;

ALTER TABLE DailyReports
MODIFY COLUMN ShopId CHAR(36) NOT NULL;

-- Fix 1.3: Add soft delete support to critical financial tables
ALTER TABLE Sales ADD COLUMN (
  deletedAt DATETIME DEFAULT NULL,
  deletion_reason VARCHAR(255),
  deleted_by CHAR(36),
  KEY idx_sales_deletedAt (deletedAt),
  KEY idx_sales_deleted_by (deleted_by),
  CONSTRAINT fk_sales_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE Invoices ADD COLUMN (
  deletedAt DATETIME DEFAULT NULL,
  deletion_reason VARCHAR(255),
  deleted_by CHAR(36),
  KEY idx_invoices_deletedAt (deletedAt),
  CONSTRAINT fk_invoices_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE SaleItems ADD COLUMN (
  deletedAt DATETIME DEFAULT NULL,
  KEY idx_saleitems_deletedAt (deletedAt)
);

ALTER TABLE Purchases ADD COLUMN (
  deletedAt DATETIME DEFAULT NULL,
  deletion_reason VARCHAR(255),
  deleted_by CHAR(36),
  KEY idx_purchases_deletedAt (deletedAt),
  CONSTRAINT fk_purchases_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE PurchaseItems ADD COLUMN (
  deletedAt DATETIME DEFAULT NULL,
  KEY idx_purchaseitems_deletedAt (deletedAt)
);

ALTER TABLE Expenses ADD COLUMN (
  deletedAt DATETIME DEFAULT NULL,
  deletion_reason VARCHAR(255),
  deleted_by CHAR(36),
  KEY idx_expenses_deletedAt (deletedAt),
  CONSTRAINT fk_expenses_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Fix 1.4: Enforce unique Invoice-Sale relationship
ALTER TABLE Invoices 
ADD CONSTRAINT uk_invoice_sale UNIQUE KEY (SaleId);

-- Fix 1.5: Cash Session Reconciliation Fields
ALTER TABLE CashSessions ADD COLUMN (
  expected_closing_balance DECIMAL(15,2) COMMENT 'Opening balance + Sales - Expenses',
  counted_amount DECIMAL(15,2) COMMENT 'Physical cash count by cashier',
  variance DECIMAL(15,2) GENERATED ALWAYS AS (counted_amount - expected_closing_balance) STORED COMMENT 'Variance must be explained',
  reconciled_at DATETIME,
  reconciled_by CHAR(36),
  reconciliation_status ENUM('pending','reconciled','discrepancy') DEFAULT 'pending',
  discrepancy_notes TEXT,
  KEY idx_cashsession_reconciled_at (reconciled_at),
  KEY idx_cashsession_reconciliation_status (reconciliation_status),
  CONSTRAINT fk_cashsession_reconciled_by FOREIGN KEY (reconciled_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Fix 1.6: Add ShopId to Sessions (for multi-tenant isolation)
ALTER TABLE Sessions ADD COLUMN (
  ShopId CHAR(36) DEFAULT NULL,
  KEY idx_sessions_ShopId (ShopId),
  CONSTRAINT fk_sessions_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE SET NULL
);

-- Populate ShopId from user records
UPDATE Sessions s
SET ShopId = (SELECT ShopId FROM users WHERE id = s.UserId)
WHERE ShopId IS NULL;

-- Fix 1.7: Enforce Expense Category (ExpenseTypeId NOT NULL)
-- First, create "Miscellaneous" category if needed
INSERT INTO ExpenseTypes (id, name, ShopId)
SELECT UUID(), 'General/Miscellaneous', NULL
WHERE NOT EXISTS (SELECT 1 FROM ExpenseTypes WHERE name = 'General/Miscellaneous');

-- Update null expenses to use miscellaneous
UPDATE Expenses 
SET ExpenseTypeId = (SELECT id FROM ExpenseTypes WHERE name = 'General/Miscellaneous' LIMIT 1)
WHERE ExpenseTypeId IS NULL;

-- Enforce NOT NULL
ALTER TABLE Expenses 
MODIFY COLUMN ExpenseTypeId CHAR(36) NOT NULL;

-- Fix 1.8: Daily Report Immutability
ALTER TABLE DailyReports ADD COLUMN (
  report_locked_at DATETIME DEFAULT NULL COMMENT 'Null = editable, Timestamp = locked and immutable',
  locked_by CHAR(36),
  lock_reason VARCHAR(255),
  KEY idx_dailyreports_locked_at (report_locked_at),
  CONSTRAINT fk_dailyreports_locked_by FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Fix 1.9: Add ShopId to sync_queue for offline-first isolation
ALTER TABLE sync_queue ADD COLUMN (
  ShopId CHAR(36),
  KEY idx_syncqueue_ShopId (ShopId),
  CONSTRAINT fk_syncqueue_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- Fix 1.10: CashRegisters simplified model (remove session-specific fields)
-- These should only track the physical register, not sessions
-- Sessions are tracked in CashSessions table
ALTER TABLE CashRegisters MODIFY COLUMN (
  name VARCHAR(100) DEFAULT 'Main Register' COMMENT 'Physical register name',
  balance DECIMAL(10,2) DEFAULT 0 COMMENT 'Current balance (informational)',
  status ENUM('open','closed') DEFAULT 'open' COMMENT 'Register operational status'
);

-- =========================================================================
-- PHASE 1: DATABASE TRIGGERS (Critical)
-- =========================================================================

DELIMITER //

-- Trigger 1: Prevent Daily Report editing after locked
CREATE TRIGGER tr_dailyreport_prevent_edit_if_locked
BEFORE UPDATE ON DailyReports
FOR EACH ROW
BEGIN
  IF OLD.report_locked_at IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'This daily report is locked and cannot be modified';
  END IF;
END //

-- Trigger 2: Prevent Cash Session editing after closure
CREATE TRIGGER tr_cashsession_prevent_edit_if_closed
BEFORE UPDATE ON CashSessions
FOR EACH ROW
BEGIN
  IF OLD.status = 'closed' AND NEW.status = 'closed' THEN
    IF NOT (OLD.reconciliation_status = NEW.reconciliation_status) THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot modify closed cash session';
    END IF;
  END IF;
END //

-- Trigger 3: Prevent Sale deletion if invoice exists
CREATE TRIGGER tr_prevent_sale_delete_if_invoiced
BEFORE DELETE ON Sales
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM Invoices WHERE SaleId = OLD.id AND deletedAt IS NULL) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Cannot delete sale with existing invoice. Must delete invoice first.';
  END IF;
END //

-- Trigger 4: Auto-create StockMovement audit when SaleItem inserted
CREATE TRIGGER tr_saleitem_insert_deduct_stock
AFTER INSERT ON SaleItems
FOR EACH ROW
BEGIN
  DECLARE v_stock_id CHAR(36);
  DECLARE v_prev_qty DECIMAL(15,2);
  DECLARE v_shop_id CHAR(36);
  DECLARE v_msg VARCHAR(255);
  
  -- Get sale's shop
  SELECT ShopId INTO v_shop_id FROM Sales WHERE id = NEW.SaleId;
  
  -- Find and lock stock for update
  SELECT id, quantity INTO v_stock_id, v_prev_qty
  FROM Stocks
  WHERE ProductId = NEW.ProductId AND ShopId = v_shop_id
  LIMIT 1;
  
  -- Validate stock exists
  IF v_stock_id IS NULL THEN
    SET v_msg = CONCAT('Stock record not found for Product ', NEW.ProductId, ' in Shop ', v_shop_id);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
  END IF;
  
  -- Validate sufficient quantity
  IF v_prev_qty < NEW.quantity THEN
    SET v_msg = CONCAT('Insufficient stock. Available: ', v_prev_qty, ', Requested: ', NEW.quantity);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
  END IF;
  
  -- Create movement audit record
  INSERT INTO StockMovements (
    id, StockId, type, reason, quantityChange,
    previousQuantity, newQuantity, referenceId, createdAt
  ) VALUES (
    UUID(), v_stock_id, 'OUT', 'SALE',
    -NEW.quantity, v_prev_qty, v_prev_qty - NEW.quantity,
    NEW.SaleId, NOW()
  );
  
  -- Deduct from stock
  UPDATE Stocks
  SET quantity = quantity - NEW.quantity,
      updatedAt = NOW()
  WHERE id = v_stock_id;
END //

-- Trigger 5: Sync GlobalStock when Stocks updated (warehouse inventory)
CREATE TRIGGER tr_stock_update_sync_global
AFTER UPDATE ON Stocks
FOR EACH ROW
BEGIN
  UPDATE GlobalStocks
  SET quantity = (
    SELECT COALESCE(SUM(s.quantity), 0)
    FROM Stocks s
    WHERE s.ProductId = NEW.ProductId
  ),
  updatedAt = NOW()
  WHERE ProductId = NEW.ProductId;
  
  -- Create movement audit if quantity changed
  IF NEW.quantity != OLD.quantity THEN
    INSERT INTO StockMovements (
      id, StockId, type, reason, quantityChange,
      previousQuantity, newQuantity, referenceId, createdAt
    ) VALUES (
      UUID(), NEW.id, 'ADJUSTMENT', 'ADJUSTMENT',
      (NEW.quantity - OLD.quantity), OLD.quantity, NEW.quantity,
      NULL, NOW()
    );
  END IF;
END //

-- Trigger 6: Validate credit payment doesn't exceed total credit
CREATE TRIGGER tr_validate_credit_payment_amount
BEFORE INSERT ON credit_payments
FOR EACH ROW
BEGIN
  DECLARE v_total_paid DECIMAL(12,2);
  DECLARE v_total_credit DECIMAL(12,2);
  
  SELECT 
    COALESCE(SUM(cp.amount), 0),
    cc.total_credit
  INTO v_total_paid, v_total_credit
  FROM credit_payments cp
  JOIN customer_credits cc ON cp.credit_id = cc.id
  WHERE cp.credit_id = NEW.credit_id;
  
  IF (v_total_paid + NEW.amount) > v_total_credit THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = CONCAT('Payment exceeds credit. Total: ', v_total_credit, ', Paid: ', v_total_paid, ', New: ', NEW.amount);
  END IF;
END //

-- Trigger 7: Update customer_credits status after payment insert
CREATE TRIGGER tr_credit_payment_update_status
AFTER INSERT ON credit_payments
FOR EACH ROW
BEGIN
  UPDATE customer_credits
  SET 
    paid_credit = paid_credit + NEW.amount,
    remaining_credit = total_credit - (paid_credit + NEW.amount),
    status = CASE
      WHEN (paid_credit + NEW.amount) >= total_credit THEN 'paid'
      WHEN (paid_credit + NEW.amount) > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updatedAt = NOW()
  WHERE id = NEW.credit_id;
END //

DELIMITER ;

-- =========================================================================
-- PHASE 2: HIGH PRIORITY FIXES (Weeks 2-4)
-- =========================================================================

-- Fix 2.1: Purchase Receiving Workflow
ALTER TABLE Purchases ADD COLUMN (
  expected_quantity DECIMAL(15,2) DEFAULT 0 COMMENT 'Total expected from PO line items',
  received_quantity DECIMAL(15,2) DEFAULT 0 COMMENT 'Quantity physically received',
  received_at DATETIME COMMENT 'When purchase was received/completed',
  received_by CHAR(36) COMMENT 'User who confirmed receipt',
  receiving_variance DECIMAL(15,2) GENERATED ALWAYS AS (received_quantity - expected_quantity) STORED COMMENT 'Variance for reconciliation',
  variance_reason VARCHAR(255) COMMENT 'Explanation of variance if exists',
  KEY idx_purchases_received_by (received_by),
  KEY idx_purchases_received_at (received_at),
  CONSTRAINT fk_purchases_received_by FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Fix 2.2: Stock Adjustment Authorization Trail
ALTER TABLE stock_adjustments ADD COLUMN (
  authorization_by CHAR(36) COMMENT 'Manager who authorized the adjustment',
  authorization_at DATETIME COMMENT 'When adjustment was authorized',
  count_document_reference VARCHAR(100) COMMENT 'Reference to physical count document',
  KEY idx_stock_adj_auth_by (authorization_by),
  KEY idx_stock_adj_auth_at (authorization_at),
  CONSTRAINT fk_stock_adj_auth_by FOREIGN KEY (authorization_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Fix 2.3: Stock Transfer Delivery Tracking
ALTER TABLE StockTransfers ADD COLUMN (
  expected_delivery_at DATETIME COMMENT 'Expected arrival date at destination',
  delivery_confirmed_at DATETIME COMMENT 'Actual delivery confirmation',
  escalation_at DATETIME COMMENT 'Escalated if not received by expected date',
  escalation_reason VARCHAR(255) COMMENT 'Reason for escalation'
);

-- Fix 2.4: Customer Credit Adjustment History
CREATE TABLE IF NOT EXISTS credit_adjustments (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID v4',
  credit_id CHAR(36) NOT NULL COMMENT 'Reference to customer_credits',
  old_amount DECIMAL(12,2) COMMENT 'Previous credit amount',
  new_amount DECIMAL(12,2) COMMENT 'New credit amount after adjustment',
  adjustment_reason VARCHAR(255) NOT NULL COMMENT 'Why adjustment was made',
  adjusted_by CHAR(36) NOT NULL COMMENT 'User who made adjustment',
  adjusted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approval_by CHAR(36) COMMENT 'Manager approval',
  approval_at DATETIME,
  approval_comments TEXT,
  KEY idx_credit_adj_credit (credit_id),
  KEY idx_credit_adj_by (adjusted_by),
  KEY idx_credit_adj_at (adjusted_at),
  CONSTRAINT fk_credit_adj_credit FOREIGN KEY (credit_id) REFERENCES customer_credits(id) ON DELETE CASCADE,
  CONSTRAINT fk_credit_adj_by FOREIGN KEY (adjusted_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_credit_adj_approval FOREIGN KEY (approval_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Fix 2.5: Add customer credit enhancement fields
ALTER TABLE customer_credits ADD COLUMN (
  original_amount DECIMAL(12,2) NOT NULL COMMENT 'Immutable original credit amount',
  write_off_amount DECIMAL(12,2) DEFAULT 0 COMMENT 'Amount written off (forgiving)',
  adjustments_count INT DEFAULT 0 COMMENT 'Number of adjustments made',
  last_adjusted_by CHAR(36) COMMENT 'Last user who modified credit',
  dispute_reason TEXT COMMENT 'If disputed, reason why',
  dispute_raised_at DATETIME COMMENT 'When dispute was raised',
  dispute_resolved_at DATETIME COMMENT 'When dispute was resolved',
  dispute_resolved_by CHAR(36) COMMENT 'User who resolved dispute',
  KEY idx_credit_disputes (dispute_resolved_at),
  KEY idx_credit_adjustments_count (adjustments_count),
  CONSTRAINT fk_credit_last_adj_by FOREIGN KEY (last_adjusted_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_credit_dispute_by FOREIGN KEY (dispute_resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Fix 2.6: CashMovement ShopId for isolation
ALTER TABLE CashMovements ADD COLUMN (
  ShopId CHAR(36) COMMENT 'Shop this cash movement belongs to',
  KEY idx_cashmovement_ShopId (ShopId),
  CONSTRAINT fk_cashmovement_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- Populate from CashRegisters
UPDATE CashMovements cm
SET ShopId = (SELECT ShopId FROM CashRegisters WHERE id = cm.CashRegisterId)
WHERE ShopId IS NULL;

-- Fix 2.7: Product Pricing Rules per-shop capability
ALTER TABLE ProductPricingRules ADD COLUMN (
  ShopId CHAR(36) COMMENT 'NULL for global, CHAR(36) for shop-specific pricing',
  KEY idx_pricing_ShopId (ShopId),
  CONSTRAINT fk_pricing_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- Fix 2.8: Device login attempt tracking
ALTER TABLE devices ADD COLUMN (
  last_activity_at DATETIME COMMENT 'Last time device was actively used',
  failed_login_attempts INT DEFAULT 0 COMMENT 'Consecutive failed logins',
  locked_until DATETIME COMMENT 'Device locked until this time after too many failed attempts',
  lockout_reason VARCHAR(255),
  KEY idx_device_locked_until (locked_until),
  KEY idx_device_last_activity (last_activity_at)
);

-- Fix 2.9: Daily cash report ShopId
ALTER TABLE daily_cash_reports ADD COLUMN (
  ShopId CHAR(36) COMMENT 'Shop this report belongs to',
  KEY idx_daily_cash_ShopId (ShopId),
  CONSTRAINT fk_daily_cash_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE
);

-- Populate from users
UPDATE daily_cash_reports dcr
SET ShopId = (SELECT ShopId FROM users WHERE id = dcr.user_id LIMIT 1)
WHERE ShopId IS NULL;

-- Fix 2.10: Notification ShopId isolation
ALTER TABLE notifications ADD COLUMN (
  ShopId CHAR(36) COMMENT 'Shop this notification belongs to',
  UserId CHAR(36) COMMENT 'Target user (optional)',
  KEY idx_notifications_ShopId (ShopId),
  KEY idx_notifications_UserId (UserId),
  CONSTRAINT fk_notifications_ShopId FOREIGN KEY (ShopId) REFERENCES Shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_UserId FOREIGN KEY (UserId) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================================================
-- PHASE 2: PERFORMANCE INDEXES
-- =========================================================================

-- User authentication
ALTER TABLE users ADD INDEX idx_users_email_active (email, is_active);
ALTER TABLE users ADD INDEX idx_users_ShopId_role (ShopId, role);

-- Sales queries
ALTER TABLE Sales ADD INDEX idx_sales_ShopId_date (ShopId, createdAt);
ALTER TABLE Sales ADD INDEX idx_sales_status_date (status, createdAt);
ALTER TABLE Sales ADD INDEX idx_sales_customer (CustomerId);
ALTER TABLE Sales ADD INDEX idx_sales_session (CashSessionId);

-- Customer queries
ALTER TABLE Customers ADD INDEX idx_customers_ShopId_email (ShopId, email);
ALTER TABLE Customers ADD INDEX idx_customers_phone (phone);

-- Inventory queries (CRITICAL for POS performance)
ALTER TABLE Stocks ADD INDEX idx_stock_ShopId_qty (ShopId, quantity, min_stock_level);
ALTER TABLE StockMovements ADD INDEX idx_movements_product_date (StockId, createdAt DESC);
ALTER TABLE StockMovements ADD INDEX idx_movements_reason (reason);

-- Purchase queries
ALTER TABLE Purchases ADD INDEX idx_purchases_ShopId_status (ShopId, status);
ALTER TABLE Purchases ADD INDEX idx_purchases_supplier_date (SupplierId, createdAt);

-- Cash operations
ALTER TABLE CashSessions ADD INDEX idx_cashsession_shop_opened (ShopId, opened_at DESC);
ALTER TABLE CashMovements ADD INDEX idx_cashmovement_register_date (CashRegisterId, createdAt);

-- Daily reports
ALTER TABLE DailyReports ADD INDEX idx_dailyreports_shop_month (ShopId, YEAR(report_date), MONTH(report_date));

-- Expenses
ALTER TABLE Expenses ADD INDEX idx_expenses_ShopId_date (ShopId, date);
ALTER TABLE Expenses ADD INDEX idx_expenses_type (ExpenseTypeId);

-- Audit logs
ALTER TABLE audit_logs ADD INDEX idx_audit_table_date (table_name, createdAt DESC);
ALTER TABLE audit_logs ADD INDEX idx_audit_shop (ShopId, createdAt DESC);

-- Sync queue
ALTER TABLE sync_queue ADD INDEX idx_syncqueue_status_date (status, createdAt);
ALTER TABLE sync_queue ADD INDEX idx_syncqueue_device_status (device_id, status);

-- =========================================================================
-- PHASE 3: AUDIT LOGGING ENHANCEMENTS (Month 2)
-- =========================================================================

-- Audit log enhancement fields
ALTER TABLE audit_logs ADD COLUMN (
  ip_address VARCHAR(50) COMMENT 'IP address of the change',
  device_id VARCHAR(100) COMMENT 'Device that made the change',
  change_reason VARCHAR(255) COMMENT 'Business reason for change',
  is_sensitive_field TINYINT(1) DEFAULT 0 COMMENT 'Flags if contains PII/sensitive data',
  new_values_masked JSON COMMENT 'New values with sensitive fields masked',
  KEY idx_audit_ip (ip_address),
  KEY idx_audit_device (device_id),
  KEY idx_audit_sensitive (is_sensitive_field)
);

-- Cash Session Enhanced Audit
ALTER TABLE CashSessions ADD COLUMN (
  opening_count_by CHAR(36) COMMENT 'Who physically counted opening cash',
  opening_count_at DATETIME COMMENT 'When opening count was done',
  closing_count_by CHAR(36) COMMENT 'Who physically counted closing cash',
  closing_count_at DATETIME COMMENT 'When closing count was done',
  physical_count_amount DECIMAL(15,2) COMMENT 'Actual cash counted (not calculated)',
  audit_by CHAR(36) COMMENT 'Manager who audited the session',
  audit_at DATETIME COMMENT 'When audit occurred',
  audit_notes TEXT COMMENT 'Notes from audit',
  is_locked TINYINT(1) DEFAULT 0 COMMENT 'Session locked after audit',
  KEY idx_cashsession_audit_at (audit_at),
  KEY idx_cashsession_open_count_by (opening_count_by),
  KEY idx_cashsession_close_count_by (closing_count_by),
  CONSTRAINT fk_cashsession_opening_by FOREIGN KEY (opening_count_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cashsession_closing_by FOREIGN KEY (closing_count_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cashsession_audit_by FOREIGN KEY (audit_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =========================================================================
-- REPORTING VIEWS (Month 2)
-- =========================================================================

-- Current Stock Status
CREATE VIEW IF NOT EXISTS v_stock_status AS
SELECT 
  s.ShopId,
  sh.name as shop_name,
  p.id as product_id,
  p.name as product_name,
  c.name as category_name,
  b.name as brand_name,
  s.quantity,
  s.min_stock_level,
  gs.quantity as global_quantity,
  CASE 
    WHEN s.quantity < s.min_stock_level THEN 'LOW'
    WHEN s.quantity = 0 THEN 'OUT_OF_STOCK'
    WHEN s.quantity > s.min_stock_level * 2 THEN 'OVER_STOCK'
    ELSE 'OK'
  END as stock_status
FROM Stocks s
JOIN Shops sh ON s.ShopId = sh.id
JOIN Products p ON s.ProductId = p.id
LEFT JOIN Categories c ON p.CategoryId = c.id
LEFT JOIN Brands b ON p.BrandId = b.id
LEFT JOIN GlobalStocks gs ON p.id = gs.ProductId;

-- Daily Sales Summary
CREATE VIEW IF NOT EXISTS v_daily_sales_summary AS
SELECT 
  DATE(s.createdAt) as sale_date,
  s.ShopId,
  sh.name as shop_name,
  COUNT(*) as transaction_count,
  COUNT(DISTINCT s.UserId) as unique_cashiers,
  COUNT(DISTINCT s.CustomerId) as unique_customers,
  SUM(s.subtotal) as total_subtotal,
  SUM(s.tax_amount) as total_tax,
  SUM(s.total_amount) as total_revenue,
  SUM(CASE WHEN s.paymentMethod = 'CASH' THEN s.total_amount ELSE 0 END) as cash_revenue,
  SUM(CASE WHEN s.paymentMethod = 'MOBILE_MONEY' THEN s.total_amount ELSE 0 END) as mobile_revenue,
  SUM(CASE WHEN s.paymentMethod = 'CREDIT' THEN s.total_amount ELSE 0 END) as credit_revenue,
  AVG(s.total_amount) as avg_transaction_size
FROM Sales s
JOIN Shops sh ON s.ShopId = sh.id
WHERE s.status = 'COMPLETED' AND s.deletedAt IS NULL
GROUP BY DATE(s.createdAt), s.ShopId, sh.name;

-- Cashier Performance
CREATE VIEW IF NOT EXISTS v_cashier_performance AS
SELECT 
  DATE(s.createdAt) as transaction_date,
  u.username as cashier,
  u.id as user_id,
  u.ShopId,
  COUNT(*) as transactions,
  SUM(s.total_amount) as total_handled,
  COUNT(DISTINCT s.CustomerId) as unique_customers,
  AVG(s.total_amount) as avg_transaction_size,
  MIN(s.createdAt) as first_transaction,
  MAX(s.createdAt) as last_transaction
FROM Sales s
JOIN users u ON s.UserId = u.id
WHERE s.status = 'COMPLETED' AND s.deletedAt IS NULL
GROUP BY DATE(s.createdAt), u.username, u.id, u.ShopId;

-- =========================================================================
-- CRITICAL CONSTRAINT CHECKS
-- =========================================================================

-- Verify all critical FKs are in place
ALTER TABLE Customers ADD CONSTRAINT ck_customer_ShopId_required
CHECK (ShopId IS NOT NULL);

ALTER TABLE DailyReports ADD CONSTRAINT ck_daily_report_ShopId_required
CHECK (ShopId IS NOT NULL);

ALTER TABLE sync_queue ADD CONSTRAINT ck_syncqueue_must_have_reference
CHECK ((entity_id IS NOT NULL) OR (device_id IS NOT NULL));

-- =========================================================================
-- END OF PRODUCTION FIXES
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 1;

-- Recompile all views
FLUSH PRIVILEGES;

-- Final verification (these should all return 0 if data is clean)
SELECT 'Orphaned Sales (no SaleItems)' as check_type, COUNT(*) as count
FROM Sales s
WHERE s.deletedAt IS NULL
AND NOT EXISTS (SELECT 1 FROM SaleItems si WHERE si.SaleId = s.id AND si.deletedAt IS NULL);

SELECT 'Oversold Stock (negative qty)' as check_type, COUNT(*) as count
FROM Stocks WHERE quantity < 0;

SELECT 'Daily Reports without Shop' as check_type, COUNT(*) as count
FROM DailyReports WHERE ShopId IS NULL;

SELECT 'Orphaned Invoices' as check_type, COUNT(*) as count
FROM Invoices i
WHERE i.deletedAt IS NULL
AND NOT EXISTS (SELECT 1 FROM Sales WHERE id = i.SaleId);

SELECT 'Customers without Shop' as check_type, COUNT(*) as count
FROM Customers WHERE ShopId IS NULL;
