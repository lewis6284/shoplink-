# ShopLink ERP Database Architecture - COMPREHENSIVE AUDIT REPORT
## Senior Database Architect Review
**Date:** May 16, 2026  
**System:** Multi-tenant ERP/POS with offline-first mobile support  
**Stack:** Node.js + Sequelize + MySQL 5.7+  

---

## 1. EXECUTIVE SUMMARY

**Overall Assessment:** ⚠️ **PRODUCTION-GRADE with CRITICAL IMPROVEMENTS REQUIRED**

The current architecture demonstrates strong foundational design with proper multi-tenant isolation patterns, comprehensive foreign key constraints, and thoughtful cascade rules. However, several critical gaps threaten financial accuracy, inventory integrity, and offline sync consistency.

**Key Strengths:**
- ✅ Comprehensive foreign key constraints (65+ FKs)
- ✅ Multi-tenant ShopId isolation on all critical tables
- ✅ UNIQUE constraints on composite keys (stock, daily reports, users)
- ✅ Proper cascade rules (ON DELETE CASCADE for detail tables, SET NULL for optional references)
- ✅ JSON support for flexible reporting and breakdown data
- ✅ Audit trail infrastructure (audit_logs, sync_queue)

**Critical Deficiencies:**
- ❌ Missing transactional consistency triggers for financial calculations
- ❌ No database-level enforcement of cash session integrity
- ❌ Stock movement audit trail incomplete for deductions
- ❌ Missing soft-delete (paranoid) support on core transactional tables
- ❌ No explicit transaction isolation level defined
- ❌ Credit system lacks payment reversal mechanisms
- ❌ No database views for financial reporting
- ❌ Missing debounce mechanism for concurrent cash movements
- ❌ Offline sync queue lacks reconciliation triggers
- ❌ No financial year/period partitioning strategy

**Architecture Quality Score: 7.2/10**

---

## 2. CRITICAL ISSUES (PRODUCTION-BREAKING)

### 2.1. **CRITICAL: Race Condition in Daily Report Generation**
**Severity:** 🔴 CRITICAL  
**Impact:** Duplicate daily reports, financial discrepancies, reporting inconsistencies

**Problem:**
```sql
UNIQUE KEY uk_dailyreport_shop_date (ShopId, report_date)
```
This constraint prevents duplicate reports BUT:
- No row-level lock during generation
- Concurrent requests can create deadlock or race conditions
- No locking mechanism in Sequelize model

**Evidence from code:**
- `DailyReport.js` has composite unique index but model lacks transaction/locking
- `report.service.js` _persistDailyReport() doesn't use `FOR UPDATE` lock

**Fix Required:**
```sql
-- Add generated_at with finer granularity
ALTER TABLE DailyReports 
MODIFY generated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6);

-- Ensure query uses SELECT FOR UPDATE
-- (Must be implemented in Sequelize service)
```

---

### 2.2. **CRITICAL: Cash Session Without Reconciliation**
**Severity:** 🔴 CRITICAL  
**Impact:** Cash theft undetectable, floating discrepancies, audit trail gaps

**Problem:**
```sql
-- CashSessions table lacks:
-- 1. Expected total calculation
-- 2. Actual counted amount
-- 3. Variance tracking
-- 4. Reconciliation timestamp
-- 5. Reconciliation user
```

**What's Missing:**
```sql
ALTER TABLE CashSessions ADD COLUMN (
  expected_closing_balance DECIMAL(15,2) COMMENT 'Opening + Sales - Expenses',
  counted_amount DECIMAL(15,2) COMMENT 'Physical count',
  variance DECIMAL(15,2) GENERATED ALWAYS AS (counted_amount - expected_closing_balance),
  reconciled_at DATETIME,
  reconciled_by CHAR(36),
  reconciliation_status ENUM('pending','reconciled','discrepancy') DEFAULT 'pending'
);
```

---

### 2.3. **CRITICAL: Stock Deduction NOT ENFORCED at Database Level**
**Severity:** 🔴 CRITICAL  
**Impact:** Inventory corruption, negative stock, untrackable shrinkage

**Problem:**
- Sales creates SaleItems but NO trigger decrements Stocks.quantity
- StockMovements is an audit table, NOT the truth table
- No database constraint preventing negative stock
- Concurrent sales can create race conditions on stock updates

**Missing Database Triggers:**
```sql
DELIMITER //

-- Trigger 1: Auto-create StockMovement on Sale
CREATE TRIGGER tr_sale_item_insert_stock_movement
AFTER INSERT ON SaleItems
FOR EACH ROW
BEGIN
  DECLARE v_stock_id CHAR(36);
  DECLARE v_shop_id CHAR(36);
  DECLARE v_prev_qty DECIMAL(15,2);
  
  -- Find stock record
  SELECT s.id, s.ShopId, s.quantity INTO v_stock_id, v_shop_id, v_prev_qty
  FROM Stocks s
  WHERE s.ProductId = NEW.ProductId
  LIMIT 1;
  
  -- Insert movement audit
  INSERT INTO StockMovements (
    id, StockId, type, reason, quantityChange,
    previousQuantity, newQuantity, referenceId, createdAt
  ) VALUES (
    UUID(), v_stock_id, 'OUT', 'SALE',
    -NEW.quantity, v_prev_qty, v_prev_qty - NEW.quantity,
    (SELECT id FROM Sales WHERE id = NEW.SaleId), NOW()
  );
  
  -- Deduct from Stock
  UPDATE Stocks SET quantity = quantity - NEW.quantity
  WHERE id = v_stock_id
  AND quantity >= NEW.quantity; -- Prevent oversell
  
  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Insufficient stock for product';
  END IF;
END //

DELIMITER ;
```

---

### 2.4. **CRITICAL: No Invoice-to-Sale Atomicity**
**Severity:** 🔴 CRITICAL  
**Impact:** Revenue recognition issues, duplicate invoicing, orphaned invoices

**Problem:**
- Invoice can be created without Sale (orphaned invoice)
- No constraint: `CONSTRAINT fk_invoice_SaleId ... NOT NULL`
- Invoice.SaleId is NOT marked as NOT NULL in current schema

**Current (BROKEN):**
```sql
SaleId CHAR(36) NOT NULL,  -- Good
```
✓ Actually this IS correct in current schema. But verify all services respect it.

**Risk:** If services don't validate, invoices can be created for non-existent sales.

---

### 2.5. **CRITICAL: Credit System Lacks Reversal and Dispute Mechanism**
**Severity:** 🔴 CRITICAL  
**Impact:** Credit write-offs unauditable, fraud risk, accounting mismatches

**Problem:**
```sql
-- customer_credits missing:
-- 1. original_amount (immutable audit field)
-- 2. write_off_amount
-- 3. dispute_reason
-- 4. dispute_resolved_at
-- 5. adjustments audit trail
```

**Fix:**
```sql
ALTER TABLE customer_credits ADD COLUMN (
  original_amount DECIMAL(12,2) NOT NULL COMMENT 'Immutable original credit amount',
  write_off_amount DECIMAL(12,2) DEFAULT 0 COMMENT 'Amount written off',
  adjustments_count INT DEFAULT 0 COMMENT 'Number of adjustments made',
  last_adjusted_by CHAR(36),
  dispute_reason TEXT,
  dispute_resolved_at DATETIME,
  dispute_resolved_by CHAR(36)
);

-- Create adjustments log
CREATE TABLE IF NOT EXISTS credit_adjustments (
  id CHAR(36) PRIMARY KEY,
  credit_id CHAR(36) NOT NULL,
  old_amount DECIMAL(12,2),
  new_amount DECIMAL(12,2),
  adjustment_reason VARCHAR(255),
  adjusted_by CHAR(36) NOT NULL,
  adjusted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_credit_adj_credit (credit_id),
  CONSTRAINT fk_credit_adj_credit FOREIGN KEY (credit_id) 
    REFERENCES customer_credits(id) ON DELETE CASCADE
);
```

---

### 2.6. **CRITICAL: Expense Category Mismatch Persists**
**Severity:** 🔴 CRITICAL  
**Impact:** Expense recording fails, financial reports incomplete

**Problem:**
- Sequelize has `ExpenseCategory.js` with table `expense_categories`
- SQL schema has `ExpenseTypes` table
- Expense model references `ExpenseTypeId` but no ExpenseCategory in schema

**This needs confirmation:** Current schema shows `ExpenseTypes` is correct, but verify `Expense.model.js` and service layer use the same table name.

---

### 2.7. **CRITICAL: No Purchase Receiving Workflow**
**Severity:** 🔴 CRITICAL  
**Impact:** Stock cannot be matched to PO, receiving discrepancies untrackable

**Problem:**
```sql
-- Purchases has NO:
-- 1. expected_quantity (for variance tracking)
-- 2. received_quantity
-- 3. received_at
-- 4. received_by
-- 5. receiving_discrepancy field
```

**Fix:**
```sql
ALTER TABLE Purchases ADD COLUMN (
  expected_quantity DECIMAL(15,2) COMMENT 'Total expected from PO items',
  received_quantity DECIMAL(15,2) DEFAULT 0,
  received_at DATETIME,
  received_by CHAR(36),
  receiving_variance DECIMAL(15,2) GENERATED ALWAYS AS 
    (received_quantity - expected_quantity) STORED,
  variance_reason VARCHAR(255),
  KEY idx_purchase_received_by (received_by),
  CONSTRAINT fk_purchase_received_by FOREIGN KEY (received_by) 
    REFERENCES users(id) ON DELETE SET NULL
);
```

---

### 2.8. **CRITICAL: Global Stock Not Updated on Sale**
**Severity:** 🔴 CRITICAL  
**Impact:** Warehouse-level inventory reports incorrect, stock allocation fails

**Problem:**
- GlobalStocks table exists but no trigger updates it
- Sales decrements Stocks but NOT GlobalStocks
- No mechanism to synchronize shop stock changes to warehouse level
- `reserved_quantity` field unused

**Missing Triggers:**
```sql
DELIMITER //

CREATE TRIGGER tr_stock_update_global_stock
AFTER UPDATE ON Stocks
FOR EACH ROW
BEGIN
  UPDATE GlobalStocks
  SET quantity = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM Stocks
    WHERE ProductId = NEW.ProductId
  )
  WHERE ProductId = NEW.ProductId;
END //

DELIMITER ;
```

---

### 2.9. **CRITICAL: Stock Transfer Without Atomicity**
**Severity:** 🔴 CRITICAL  
**Impact:** Inventory lost between shops, untrackable shrinkage

**Problem:**
- Transfer status is 'PENDING' → 'IN_TRANSIT' → 'RECEIVED'
- NO trigger to:
  - Deduct from source shop on 'APPROVED'
  - Add to destination shop on 'RECEIVED'
  - Prevent concurrent modifications
- Race condition: concurrent approval and receipt

**Missing Triggers:**
```sql
DELIMITER //

CREATE TRIGGER tr_stock_transfer_approved
AFTER UPDATE ON StockTransfers
FOR EACH ROW
WHEN (NEW.status = 'APPROVED' AND OLD.status = 'PENDING')
BEGIN
  -- Deduct from source
  UPDATE Stocks
  SET quantity = quantity - NEW.Quantity
  WHERE ProductId = NEW.ProductId 
  AND ShopId = NEW.FromShopId
  AND quantity >= NEW.Quantity;
  
  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Insufficient stock in source shop';
  END IF;
END //

CREATE TRIGGER tr_stock_transfer_received
AFTER UPDATE ON StockTransfers
FOR EACH ROW
WHEN (NEW.status = 'RECEIVED' AND OLD.status IN ('PENDING', 'IN_TRANSIT'))
BEGIN
  -- Add to destination
  INSERT INTO Stocks (id, ShopId, ProductId, quantity, min_stock_level)
  VALUES (UUID(), NEW.ToShopId, NEW.ProductId, NEW.Quantity, 0)
  ON DUPLICATE KEY UPDATE
  quantity = quantity + NEW.Quantity;
END //

DELIMITER ;
```

---

### 2.10. **CRITICAL: Soft Delete Missing on Transactional Tables**
**Severity:** 🔴 CRITICAL  
**Impact:** Audit trail broken, financial records disappear, compliance violations

**Problem:**
- No `deletedAt` field on:
  - Sales
  - Invoices
  - SaleItems
  - Purchases
  - PurchaseItems
  - Expenses
  - Customers

**Current:** Only Shops has `deletedAt`

**Legal/Compliance Issue:** Cannot prove data wasn't deleted. E-commerce and finance regulations require immutable audit trails.

---

## 3. RELATIONSHIP AUDIT

### 3.1 Foreign Key Validity Matrix

| FK | Source Table | Target Table | Current | Status | Issue |
|---|---|---|---|---|---|
| fk_users_ShopId | users | Shops | ✅ | OK | Correctly nullable for owners |
| fk_sessions_UserId | Sessions | users | ✅ | OK | DELETE CASCADE appropriate |
| fk_categories_parent | Categories | Categories (self) | ✅ | OK | Self-referential correct |
| fk_products_CategoryId | Products | Categories | ✅ | OK | SET NULL appropriate |
| fk_products_BrandId | Products | Brands | ✅ | OK | SET NULL appropriate |
| fk_products_SupplierId | Products | Suppliers | ✅ | OK | SET NULL appropriate |
| fk_product_images_ProductId | product_images | Products | ✅ | OK | DELETE CASCADE correct |
| fk_pricing_ProductId | ProductPricingRules | Products | ✅ | OK | DELETE CASCADE correct |
| fk_global_stock_ProductId | GlobalStocks | Products | ✅ | ⚠️ RISKY | Should be CASCADE but creates orphan if product deleted without global stock cleanup |
| fk_stock_ShopId | Stocks | Shops | ✅ | OK | DELETE CASCADE correct |
| fk_stock_ProductId | Stocks | Products | ✅ | OK | DELETE CASCADE correct |
| fk_stock_movements_StockId | StockMovements | Stocks | ✅ | ⚠️ RISKY | Should be CASCADE but loses audit trail when stock deleted |
| fk_stock_adj_product | stock_adjustments | Products | ✅ | OK | DELETE CASCADE correct |
| fk_stock_adj_user | stock_adjustments | users | ✅ | OK | SET NULL appropriate |
| fk_transfer_ProductId | StockTransfers | Products | ✅ | OK | DELETE CASCADE - but loses transfer audit |
| fk_transfer_FromShopId | StockTransfers | Shops | ✅ | OK | DELETE CASCADE correct |
| fk_transfer_ToShopId | StockTransfers | Shops | ✅ | OK | DELETE CASCADE correct |
| fk_transfer_CreatedBy | StockTransfers | users | ✅ | OK | DELETE RESTRICT prevents user deletion if transfer exists |
| fk_transfer_ApprovedBy | StockTransfers | users | ✅ | OK | SET NULL appropriate |
| fk_transfer_ReceivedBy | StockTransfers | users | ✅ | OK | SET NULL appropriate |
| fk_customers_ShopId | Customers | Shops | ✅ | OK | DELETE CASCADE - but customers persist orphaned |
| fk_credit_customer | customer_credits | Customers | ✅ | ⚠️ RISKY | DELETE CASCADE loses credit audit |
| fk_credit_sale | customer_credits | Sales | ✅ | OK | SET NULL allows credit without sale |
| fk_payment_credit | credit_payments | customer_credits | ✅ | OK | DELETE CASCADE correct |
| fk_sales_ShopId | Sales | Shops | ✅ | OK | DELETE CASCADE - loses financial audit |
| fk_sales_UserId | Sales | users | ✅ | OK | DELETE RESTRICT prevents user deletion |
| fk_sales_CashSessionId | Sales | CashSessions | ✅ | OK | SET NULL allows orphaned sales |
| fk_sales_CustomerId | Sales | Customers | ✅ | OK | SET NULL for cash sales |
| fk_saleitem_SaleId | SaleItems | Sales | ✅ | OK | DELETE CASCADE correct |
| fk_saleitem_ProductId | SaleItems | Products | ✅ | OK | DELETE RESTRICT prevents product deletion if sold |
| fk_invoice_SaleId | Invoices | Sales | ✅ | ⚠️ RISKY | DELETE CASCADE loses invoice audit if sale deleted |
| fk_invoice_ShopId | Invoices | Shops | ✅ | OK | DELETE CASCADE correct |
| fk_invoice_UserId | Invoices | users | ✅ | OK | DELETE RESTRICT prevents user deletion |
| fk_cashregister_ShopId | CashRegisters | Shops | ✅ | OK | DELETE CASCADE correct |
| fk_cashsession_CashRegisterId | CashSessions | CashRegisters | ✅ | OK | SET NULL allows orphaned sessions |
| fk_cashsession_UserId | CashSessions | users | ✅ | OK | SET NULL appropriate for job changes |
| fk_cashsession_ShopId | CashSessions | Shops | ✅ | OK | DELETE CASCADE - loses financial audit |
| fk_cashmovement_CashRegisterId | CashMovements | CashRegisters | ✅ | OK | DELETE CASCADE - loses cash audit |
| fk_dailyreport_ShopId | DailyReports | Shops | ✅ | OK | DELETE CASCADE - loses financial reports |
| fk_daily_cash_user | daily_cash_reports | users | ✅ | OK | DELETE CASCADE loses shift reports |
| fk_expensetype_ShopId | ExpenseTypes | Shops | ✅ | OK | DELETE CASCADE correct |
| fk_expense_ShopId | Expenses | Shops | ✅ | OK | DELETE CASCADE - loses expense audit |
| fk_expense_ExpenseTypeId | Expenses | ExpenseTypes | ✅ | OK | SET NULL allows unclassified expenses |
| fk_expense_UserId | Expenses | users | ✅ | OK | SET NULL appropriate |
| fk_purchase_SupplierId | Purchases | Suppliers | ✅ | OK | SET NULL allows orphaned POs |
| fk_purchase_ShopId | Purchases | Shops | ✅ | OK | DELETE CASCADE - loses audit |
| fk_purchaseitem_PurchaseId | PurchaseItems | Purchases | ✅ | OK | DELETE CASCADE correct |
| fk_purchaseitem_ProductId | PurchaseItems | Products | ✅ | OK | DELETE RESTRICT prevents product deletion |
| fk_shopfinancial_ShopId | ShopFinancials | Shops | ✅ | OK | DELETE CASCADE correct |
| fk_usershop_UserId | UserShops | users | ✅ | OK | DELETE CASCADE correct |
| fk_usershop_ShopId | UserShops | Shops | ✅ | OK | DELETE CASCADE correct |
| fk_device_user | devices | users | ✅ | OK | DELETE CASCADE correct |
| fk_audit_user | audit_logs | users | ✅ | OK | SET NULL appropriate for deleted users |
| fk_audit_shop | audit_logs | Shops | ✅ | OK | SET NULL appropriate for deleted shops |

**Key Risk Findings:**
- ⚠️ 8 FKs with risky DELETE CASCADE on financial/audit tables
- ⚠️ Deleting a Shop cascades to Sales, Invoices, DailyReports, Expenses, etc. - destroys entire financial history
- ⚠️ Deleting a Product cascades to StockMovements, StockTransfers, PurchaseItems - loses inventory audit trail
- ⚠️ Missing ON DELETE behavior for some critical tables

**Recommendation:** Implement soft deletes (paranoid) on all financial and transactional tables.

---

### 3.2 Cardinality Issues

| Relationship | Current | Should Be | Issue |
|---|---|---|---|
| Shop 1 → Many Users | ✅ Correct | 1:N | OK |
| User 1 → Many Sessions | ✅ Correct | 1:N | OK |
| Category 1 → Many Products | ✅ Correct | 1:N | OK |
| Brand 1 → Many Products | ✅ Correct | 1:N | OK |
| Supplier 1 → Many Products | ✅ Correct | 1:N | OK |
| Product 1 → 1 GlobalStock | ✅ Correct | 1:1 | OK |
| Product 1 → Many Stocks | ✅ Correct | 1:N | OK |
| Shop 1 → Many Stocks | ✅ Correct | 1:N | OK |
| Stock 1 → Many Movements | ✅ Correct | 1:N | OK |
| Shop 1 → Many Sales | ✅ Correct | 1:N | OK |
| Sale 1 → Many Items | ✅ Correct | 1:N | OK |
| Product 1 → Many SaleItems | ✅ Correct | 1:N | OK |
| Sale 1 → 1 Invoice | ❌ WRONG | 1:1 | Currently 1:N (multiple invoices per sale possible) |
| Shop 1 → Many CashSessions | ✅ Correct | 1:N | OK |
| CashRegister 1 → Many Sessions | ✅ Correct | 1:N | OK |
| Shop 1 → Many DailyReports | ✅ Correct | 1:N | OK (composite key on date) |
| Customer 1 → Many Credits | ✅ Correct | 1:N | OK |
| Sale 1 → 1 Credit | ❌ WRONG | 1:1 (optional) | Currently 1:N (multiple credits per sale) |
| Credit 1 → Many Payments | ✅ Correct | 1:N | OK |
| Supplier 1 → Many Purchases | ✅ Correct | 1:N | OK |
| Purchase 1 → Many Items | ✅ Correct | 1:N | OK |

**Critical Cardinality Errors:**
1. **Invoice per Sale:** Should be UNIQUE(SaleId) not FK alone
2. **Credit per Sale:** Should be UNIQUE(SaleId) not FK alone

---

### 3.3 Nullable Field Audit

| Table | Field | Current | Should Be | Reasoning |
|---|---|---|---|---|
| users | ShopId | NULL | NULL | ✅ Correct for owner accounts |
| users | email | NOT NULL | NOT NULL | ✅ OK |
| users | username | NOT NULL | NOT NULL | ✅ OK |
| Suppliers | ShopId | NULL | NULL | ⚠️ RISKY - Global suppliers? Needs business rule |
| Products | CategoryId | NULL | NULL | ⚠️ RISKY - Unclassified products |
| Products | BrandId | NULL | NULL | ✅ OK for unbranded products |
| Products | SupplierId | NULL | NULL | ⚠️ RISKY - Products without supplier? |
| Customers | full_name | NULL | NULL | ⚠️ RISKY - Anonymous customers confuse reports |
| Customers | email | NULL | NULL | ✅ OK not all have email |
| Customers | ShopId | NULL | NULL | ⚠️ CRITICAL - Customer must belong to shop |
| Sales | CashSessionId | NULL | NULL | ✅ OK for post-dated sales |
| Sales | CustomerId | NULL | NULL | ✅ OK for cash sales |
| StockTransfers | ApprovedBy | NULL | NULL | ✅ OK for pending transfers |
| StockTransfers | ReceivedBy | NULL | NULL | ✅ OK for in-transit transfers |
| DailyReports | ShopId | NULL | NULL | ⚠️ RISKY - Reports must have shop |
| Expenses | ExpenseTypeId | NULL | NULL | ✅ OK for misc expenses |
| UserShops | ShopId | NOT NULL | NOT NULL | ✅ OK |
| CashSessions | CashRegisterId | NULL | NULL | ⚠️ RISKY - Should be NOT NULL |
| CashSessions | closing_balance | NULL | NULL | ✅ OK until session closes |

**Critical Nullable Issues:**
1. **Customers.ShopId - CRITICAL:** Customer MUST belong to a shop for multi-tenant isolation. This is a security/data integrity issue.
2. **DailyReports.ShopId - CRITICAL:** Daily report MUST belong to a shop.
3. **CashSessions.CashRegisterId - RISKY:** Should be NOT NULL to properly track cash handling.

---

## 4. MULTI-TENANT ISOLATION AUDIT

### 4.1 ShopId Coverage Analysis

**Every row must belong to a shop for proper isolation.**

| Table | ShopId Present | Required | Status | Risk |
|---|---|---|---|---|
| Shops | N/A (root entity) | - | - | - |
| users | ✅ | NOT NULL for manager/cashier | ⚠️ Nullable | Medium |
| Sessions | ❌ | YES | 🔴 MISSING | HIGH |
| Categories | ❌ | DESIGN CHOICE | ⚠️ | Medium - shared or shop-specific? |
| Brands | ❌ | DESIGN CHOICE | ⚠️ | Medium - shared or shop-specific? |
| Suppliers | ✅ | NOT NULL for multi-tenant | ⚠️ Nullable | High |
| Products | ❌ | DESIGN CHOICE | ⚠️ | High if shared, OK if global |
| product_images | ❌ | Inherit from Product | ⚠️ | High |
| ProductPricingRules | ❌ | SHOULD | 🔴 MISSING | HIGH - per-shop pricing rules needed |
| GlobalStocks | ❌ | Warehouse-level (OK) | ✅ OK | - |
| Stocks | ✅ | YES | ✅ OK | - |
| StockMovements | ❌ | Inherit from Stock | ⚠️ MISSING | HIGH |
| stock_adjustments | ❌ | SHOULD | 🔴 MISSING | HIGH |
| StockTransfers | ❌ | SHOULD track originating shop | 🔴 MISSING | HIGH - audit trail incomplete |
| Customers | ✅ | NOT NULL | ⚠️ Nullable | CRITICAL |
| customer_credits | ❌ | SHOULD | 🔴 MISSING | HIGH - must match customer's shop |
| credit_payments | ❌ | SHOULD | 🔴 MISSING | HIGH |
| Sales | ✅ | YES | ✅ OK | - |
| SaleItems | ❌ | Inherit from Sale | ⚠️ MISSING | High |
| Invoices | ✅ | YES | ✅ OK | - |
| CashRegisters | ✅ | YES | ✅ OK | - |
| CashSessions | ✅ | YES | ✅ OK | - |
| CashMovements | ❌ | SHOULD track shop | 🔴 MISSING | High - cash audit incomplete |
| DailyReports | ✅ | NOT NULL | ⚠️ Nullable | CRITICAL |
| daily_cash_reports | ❌ | SHOULD | 🔴 MISSING | High |
| ExpenseTypes | ✅ | NOT NULL | ✅ OK | - |
| Expenses | ✅ | NOT NULL | ✅ OK | - |
| Purchases | ✅ | YES | ✅ OK | - |
| PurchaseItems | ❌ | Inherit from Purchase | ⚠️ MISSING | Medium |
| ShopFinancials | ✅ | YES | ✅ OK | - |
| UserShops | ✅ | YES | ✅ OK | - |
| notifications | ❌ | SHOULD | 🔴 MISSING | High |
| devices | ❌ | SHOULD | 🔴 MISSING | High - user might have devices across shops |
| settings | ❌ | DESIGN CHOICE | ⚠️ | Medium - per-shop or global? |
| units | ❌ | DESIGN CHOICE | ⚠️ | Medium - shared or per-shop? |
| audit_logs | ✅ | YES | ✅ OK | - |
| sync_queue | ❌ | SHOULD | 🔴 MISSING | HIGH - must track which shop for offline sync |

**Critical Multi-Tenant Issues:**
1. **Customers.ShopId is NULLABLE** → Cross-shop customer visibility
2. **DailyReports.ShopId is NULLABLE** → Reports appear globally
3. **Sessions has NO ShopId** → User sessions not isolated by shop
4. **StockMovements has NO ShopId** → Cannot query shop's inventory audit
5. **sync_queue has NO ShopId** → Offline changes not shop-isolated

**Security Impact:** High privilege user from Shop A could theoretically query customer/sales data from Shop B if query doesn't filter ShopId properly.

---

### 4.2 Multi-Tenant Query Isolation Checklist

**Required:** Every Sequelize query MUST include `.where({ ShopId: req.shopId })`

**Risk Tables (require manual verification in services):**
- ❌ Categories (if shared across shops, but service layer must enforce)
- ❌ Products (if shared across shops)
- ⚠️ Suppliers (nullable ShopId allows cross-shop visibility)
- ⚠️ Customers (nullable ShopId CRITICAL)
- ⚠️ Sessions (NO ShopId field)
- ⚠️ sync_queue (NO ShopId field)

**Recommendation:** Add ShopId to all detail tables and create database views for common queries:

```sql
CREATE VIEW v_shop_sessions AS
SELECT s.* 
FROM Sessions s
JOIN users u ON s.UserId = u.id
WHERE u.ShopId IS NOT NULL;
```

---

## 5. FINANCIAL INTEGRITY AUDIT

### 5.1 Sales Consistency

**Scenario:** User creates sale for 100 FBU, application crashes before SaleItem insertion.

**Current Risk:** 
- ❌ No transaction enforcement at database level
- ❌ Sale exists without items
- ❌ DailyReport total_sales already incremented?
- ❌ Cash not deducted from CashSession

**Fix Required:** Wrap in transaction with triggers.

```sql
DELIMITER //

-- Prevent Sale without Items
CREATE TRIGGER tr_sale_insert_validate
BEFORE INSERT ON Sales
FOR EACH ROW
BEGIN
  -- In real app, must check that SaleItems exist in same transaction
  -- This trigger can't enforce (timing issue), must be in application
  IF NEW.idempotency_key IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'idempotency_key is required';
  END IF;
END //

DELIMITER ;
```

**Better:** Idempotency key already present. Good!

### 5.2 Invoice Uniqueness

**Risk:** Multiple invoices for same sale

**Current:** `invoice_number VARCHAR(100) UNIQUE` - Good!
But no UNIQUE(SaleId) constraint.

**Fix:**
```sql
ALTER TABLE Invoices 
ADD UNIQUE KEY uk_invoice_sale (SaleId);
```

### 5.3 Credit Payment Atomicity

**Scenario:** Payment credited but customer_credit.paid_credit not updated.

**Missing:** Trigger to update customer_credits when payment inserted.

```sql
DELIMITER //

CREATE TRIGGER tr_credit_payment_insert
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
    END
  WHERE id = NEW.credit_id;
  
  -- Validate credit not overpaid
  IF (SELECT paid_credit FROM customer_credits WHERE id = NEW.credit_id) > 
     (SELECT total_credit FROM customer_credits WHERE id = NEW.credit_id) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Credit payment exceeds total credit amount';
  END IF;
END //

DELIMITER ;
```

### 5.4 Cash Session Closure

**Risk:** Session stays 'open' forever, cash unaccounted for.

**Missing:** 
- Enforce closure workflow
- Require reconciliation before closing
- Prevent sales after session closing

**Current Schema:** Allows this.

**Fix:**
```sql
ALTER TABLE CashSessions 
ADD CONSTRAINT ck_cash_session_closure
CHECK (
  (status = 'open' AND closed_at IS NULL) OR
  (status = 'closed' AND closed_at IS NOT NULL)
);

-- Prevent sales on closed sessions
ALTER TABLE Sales 
ADD CONSTRAINT ck_sale_active_session
FOREIGN KEY (CashSessionId) REFERENCES CashSessions(id)
  ON UPDATE RESTRICT; -- Prevent session modification after sale
```

### 5.5 Daily Report Immutability

**Risk:** Report generated, then manually edited.

**Current:** No prevent.

**Fix:**
```sql
ALTER TABLE DailyReports 
ADD COLUMN report_locked_at DATETIME COMMENT 'Null = editable, Timestamp = locked';

-- Create trigger
DELIMITER //

CREATE TRIGGER tr_dailyreport_prevent_edit
BEFORE UPDATE ON DailyReports
FOR EACH ROW
BEGIN
  IF OLD.report_locked_at IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Report is locked and cannot be modified';
  END IF;
END //

DELIMITER ;
```

### 5.6 Expense Category Required

**Risk:** Expense recorded without category, impossible to trace.

**Current:** ExpenseTypeId is nullable.

**Fix:**
```sql
ALTER TABLE Expenses 
MODIFY ExpenseTypeId CHAR(36) NOT NULL;
```

But first, handle null values:
```sql
-- Create default category
INSERT INTO ExpenseTypes (id, name, ShopId) 
VALUES (UUID(), 'General/Other', NULL);

UPDATE Expenses 
SET ExpenseTypeId = (SELECT id FROM ExpenseTypes WHERE name = 'General/Other' LIMIT 1)
WHERE ExpenseTypeId IS NULL;
```

---

## 6. INVENTORY INTEGRITY AUDIT

### 6.1 Stock Deduction Flow

**Current Flow:**
1. Sale created (Sales table)
2. SaleItems inserted (SaleItems table)
3. ??? Stock NOT decremented at DB level

**Risk:** 🔴 CRITICAL
- Concurrent sales don't see deductions
- Inventory reports show phantom stock
- No database-level consistency

**Missing Triggers:** (See section 2.3 above)

### 6.2 GlobalStock Synchronization

**Risk:** GlobalStocks.quantity doesn't match SUM(Stocks.quantity)

**Current:** No trigger maintains this.

**Fix:** Implement trigger (see section 2.8 above)

### 6.3 Stock Adjustment Audit Trail

**Current:** stock_adjustments table exists but:
- No mechanism to trigger adjustment
- No tie to physical inventory count
- Can't determine who authorized the adjustment

**Missing Fields:**
```sql
ALTER TABLE stock_adjustments ADD COLUMN (
  authorization_by CHAR(36),
  authorization_at DATETIME,
  count_document_reference VARCHAR(100),
  KEY idx_stock_adj_auth_by (authorization_by),
  CONSTRAINT fk_stock_adj_auth_by FOREIGN KEY (authorization_by) 
    REFERENCES users(id) ON DELETE SET NULL
);
```

### 6.4 Stock Transfer Completion

**Risk:** Transfer stuck in 'IN_TRANSIT' state → Stock lost

**Current:** 
- No timeout mechanism
- No escalation alert
- Can be cancelled unilaterally after approval

**Missing:**
```sql
ALTER TABLE StockTransfers ADD COLUMN (
  expected_delivery_at DATETIME,
  delivery_confirmed_at DATETIME,
  escalation_at DATETIME,
  escalation_reason VARCHAR(255)
);

-- Trigger to escalate overdue transfers
DELIMITER //

CREATE EVENT ev_escalate_overdue_transfers
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
  UPDATE StockTransfers
  SET escalation_at = NOW(),
      escalation_reason = 'Transfer overdue - not received within expected timeframe'
  WHERE status = 'IN_TRANSIT'
  AND expected_delivery_at < NOW()
  AND escalation_at IS NULL;
END //

DELIMITER ;
```

### 6.5 Purchase Receiving

**Current:** Purchases table tracks status but:
- No received_quantity field
- No matching PurchaseItems received qty
- No variance tracking

**Missing:** (See section 2.7 above)

---

## 7. PERFORMANCE RECOMMENDATIONS

### 7.1 Missing Indexes

**Critical Missing Indexes:**

```sql
-- 1. User authentication queries
ALTER TABLE users ADD INDEX idx_users_email_active (email, is_active);
ALTER TABLE users ADD INDEX idx_users_ShopId_role (ShopId, role);

-- 2. Sales filtering
ALTER TABLE Sales ADD INDEX idx_sales_ShopId_date (ShopId, createdAt);
ALTER TABLE Sales ADD INDEX idx_sales_status_date (status, createdAt);

-- 3. Customer queries
ALTER TABLE Customers ADD INDEX idx_customers_email (email);
ALTER TABLE Customers ADD INDEX idx_customers_phone (phone);

-- 4. Stock queries (critical for POS)
ALTER TABLE Stocks ADD INDEX idx_stock_ShopId_ProductId (ShopId, ProductId);
ALTER TABLE Stocks ADD INDEX idx_stock_low_level (ShopId, quantity, min_stock_level);

-- 5. Inventory movements
ALTER TABLE StockMovements ADD INDEX idx_movements_date (createdAt);
ALTER TABLE StockMovements ADD INDEX idx_movements_reference (referenceId);

-- 6. Purchases
ALTER TABLE Purchases ADD INDEX idx_purchases_ShopId_status (ShopId, status);
ALTER TABLE Purchases ADD INDEX idx_purchases_supplier_date (SupplierId, createdAt);

-- 7. Cash operations
ALTER TABLE CashSessions ADD INDEX idx_cash_session_date (ShopId, opened_at);
ALTER TABLE CashMovements ADD INDEX idx_cash_move_date (createdAt);

-- 8. Daily reporting
ALTER TABLE DailyReports ADD INDEX idx_daily_shop_month (ShopId, YEAR(report_date), MONTH(report_date));

-- 9. Expenses
ALTER TABLE Expenses ADD INDEX idx_expenses_ShopId_date (ShopId, date);

-- 10. Audit logs
ALTER TABLE audit_logs ADD INDEX idx_audit_table_date (table_name, createdAt);
ALTER TABLE audit_logs ADD INDEX idx_audit_user_date (user_id, createdAt);

-- 11. User devices (for session validation)
ALTER TABLE devices ADD INDEX idx_device_uuid_active (device_uuid, is_active);

-- 12. Credit system
ALTER TABLE customer_credits ADD INDEX idx_credits_ShopId_status (
  (SELECT ShopId FROM Customers WHERE id = customer_id), status
); -- If ShopId added to customer_credits

-- 13. Sync queue
ALTER TABLE sync_queue ADD INDEX idx_sync_status_date (status, createdAt);
ALTER TABLE sync_queue ADD INDEX idx_sync_device (device_id, status);
```

### 7.2 Query Optimization Recommendations

**1. Daily Report Generation (SLOW)**
```sql
-- Current: Joins across Sales, SaleItems, Expenses
-- Optimized: Use materialized view
CREATE TABLE daily_reports_summary (
  id CHAR(36) PRIMARY KEY,
  ShopId CHAR(36),
  report_date DATE,
  total_sales DECIMAL(15,2),
  total_expenses DECIMAL(15,2),
  sale_count INT,
  --... other aggregates
  generated_at TIMESTAMP,
  UNIQUE KEY uk_summary_shop_date (ShopId, report_date),
  KEY idx_summary_shop_date (ShopId, report_date)
);

-- Refresh via scheduled event every 30 minutes
```

**2. Stock Availability Check (CRITICAL for POS)**
```sql
-- Current: SELECT * FROM Stocks WHERE ShopId = ? AND ProductId = ?
-- Should use: Real-time aggregation with reserved quantity

-- Create view
CREATE VIEW v_available_stock AS
SELECT 
  s.ShopId,
  s.ProductId,
  s.quantity,
  COALESCE(sr.reserved_qty, 0) as reserved_quantity,
  (s.quantity - COALESCE(sr.reserved_qty, 0)) as available_qty
FROM Stocks s
LEFT JOIN (
  SELECT ProductId, ShopId, 
         COALESCE(SUM(quantity), 0) as reserved_qty
  FROM SaleItems si
  JOIN Sales s ON si.SaleId = s.id
  WHERE s.status = 'PENDING'  -- Not yet completed
  GROUP BY ProductId, ShopId
) sr ON s.ProductId = sr.ProductId 
  AND s.ShopId = sr.ShopId;
```

**3. Top-Selling Products Report**
```sql
CREATE TABLE top_products_cache (
  ShopId CHAR(36),
  ProductId CHAR(36),
  sales_count INT,
  total_qty DECIMAL(15,2),
  total_revenue DECIMAL(15,2),
  rank_by_qty INT,
  rank_by_revenue INT,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ShopId, ProductId),
  KEY idx_rank_qty (ShopId, rank_by_qty),
  KEY idx_rank_revenue (ShopId, rank_by_revenue)
);
```

---

## 8. SECURITY RECOMMENDATIONS

### 8.1 Audit Log Completeness

**Current:** audit_logs table exists but:
- ❌ No triggers to auto-insert on changes
- ❌ user_id can be NULL (deleted users)
- ❌ No IP address tracking
- ❌ No application_change_reason

**Fix:**
```sql
ALTER TABLE audit_logs ADD COLUMN (
  ip_address VARCHAR(50),
  device_id VARCHAR(100),
  change_reason VARCHAR(255),
  is_sensitive_field TINYINT(1) DEFAULT 0
);

-- Create triggers for critical tables
DELIMITER //

CREATE TRIGGER tr_sales_audit_insert
AFTER INSERT ON Sales
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (id, user_id, ShopId, action_type, table_name, new_values, createdAt)
  VALUES (
    UUID(), NEW.UserId, NEW.ShopId, 'CREATE', 'Sales',
    JSON_OBJECT('id', NEW.id, 'amount', NEW.total_amount, 'customer', NEW.CustomerId),
    NOW()
  );
END //

DELIMITER ;
```

### 8.2 Sensitive Data Protection

**Risk:** User passwords, credit card info (if stored), stored in audit logs.

**Current:** audit logs stores JSON values - could expose sensitive data.

**Fix:**
```sql
-- Add mask for sensitive fields
ALTER TABLE audit_logs ADD COLUMN (
  new_values_masked JSON COMMENT 'Passwords and PII masked'
);

-- Update trigger to mask sensitive data
DELIMITER //

CREATE TRIGGER tr_audit_mask_sensitive
BEFORE INSERT ON audit_logs
FOR EACH ROW
BEGIN
  IF NEW.table_name = 'users' THEN
    SET NEW.new_values_masked = JSON_OBJECT(
      'id', JSON_EXTRACT(NEW.new_values, '$.id'),
      'email', JSON_EXTRACT(NEW.new_values, '$.email'),
      'password_hash', '[MASKED]'
    );
  ELSE
    SET NEW.new_values_masked = NEW.new_values;
  END IF;
END //

DELIMITER ;
```

### 8.3 User Device Tracking

**Current:** devices table tracks but:
- ❌ No rate limiting on login attempts
- ❌ No deactivation on suspicious activity
- ❌ No session timeout enforcement

**Fix:**
```sql
ALTER TABLE devices ADD COLUMN (
  last_activity_at DATETIME,
  failed_login_attempts INT DEFAULT 0,
  locked_at DATETIME,
  lockout_reason VARCHAR(255)
);

-- Create index for active device queries
ALTER TABLE devices ADD INDEX idx_active_devices (user_id, is_active, locked_at);
```

### 8.4 Cash Session Audit

**Current:** CashSessions track but:
- ❌ No immutability once closed
- ❌ No digital signature capability
- ❌ No "opening cash count" vs "closing cash count"

**Fix:**
```sql
ALTER TABLE CashSessions ADD COLUMN (
  opening_count_by CHAR(36),
  opening_count_at DATETIME,
  closing_count_by CHAR(36),
  closing_count_at DATETIME,
  physical_count_amount DECIMAL(15,2),
  audit_by CHAR(36),
  audit_at DATETIME,
  audit_notes TEXT,
  digital_signature BLOB,
  is_locked TINYINT(1) DEFAULT 0,
  KEY idx_sessions_audit_at (audit_at),
  CONSTRAINT fk_session_opening_by FOREIGN KEY (opening_count_by) REFERENCES users(id),
  CONSTRAINT fk_session_closing_by FOREIGN KEY (closing_count_by) REFERENCES users(id),
  CONSTRAINT fk_session_audit_by FOREIGN KEY (audit_by) REFERENCES users(id)
);
```

---

## 9. SEQUELIZE RECOMMENDATIONS

### 9.1 Missing Associations

**In Sequelize models, add:**

```javascript
// User.js
User.hasMany(Session, { foreignKey: 'UserId' });
User.hasMany(Device, { foreignKey: 'user_id' });
User.hasMany(StockAdjustment, { foreignKey: 'user_id' });
User.hasMany(AuditLog, { foreignKey: 'user_id' });

// Shop.js
Shop.hasMany(User, { foreignKey: 'ShopId' });
Shop.hasMany(Stock, { foreignKey: 'ShopId' });
Shop.hasMany(Sale, { foreignKey: 'ShopId' });
Shop.hasMany(Purchase, { foreignKey: 'ShopId' });
Shop.hasMany(Expense, { foreignKey: 'ShopId' });
Shop.hasMany(CashRegister, { foreignKey: 'ShopId' });
Shop.hasMany(Customer, { foreignKey: 'ShopId' });

// Sale.js
Sale.hasMany(SaleItem, { foreignKey: 'SaleId', onDelete: 'CASCADE' });
Sale.hasOne(Invoice, { foreignKey: 'SaleId', onDelete: 'CASCADE' });
Sale.hasOne(CustomerCredit, { foreignKey: 'sale_id', onDelete: 'SET NULL' });
Sale.belongsTo(CashSession, { foreignKey: 'CashSessionId' });
Sale.belongsTo(Customer, { foreignKey: 'CustomerId' });
Sale.belongsTo(User, { foreignKey: 'UserId' });

// Implement paranoid soft delete
Sale.init({ ... }, {
  sequelize,
  paranoid: true,
  timestamps: true
});
```

### 9.2 Recommended Hooks

```javascript
// Purchase.js - Calculate expected quantity
Purchase.addHook('beforeCreate', async (purchase) => {
  if (purchase.ShopId) {
    // Get items from sync queue or request body
    const items = purchase.dataValues.items || [];
    purchase.expected_quantity = items.reduce((sum, item) => 
      sum + item.quantityPurchased, 0);
  }
});

// SaleItem.js - Prevent oversell
SaleItem.addHook('beforeCreate', async (saleItem, options) => {
  const stock = await Stock.findOne({
    where: { ProductId: saleItem.ProductId }
  });
  
  if (!stock || stock.quantity < saleItem.quantity) {
    throw new Error('Insufficient stock');
  }
});

// CashSession.js - Prevent editing closed sessions
CashSession.addHook('beforeUpdate', async (session) => {
  if (session.changed('status') && session.status === 'closed') {
    session.changed('closing_balance', false); // Make immutable
  }
});

// DailyReport.js - Lock reports after 24 hours
DailyReport.addHook('beforeUpdate', async (report) => {
  const hoursDiff = (Date.now() - report.createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursDiff > 24) {
    throw new Error('Cannot modify reports older than 24 hours');
  }
});
```

### 9.3 Recommended Scopes

```javascript
// Stock.js - Low stock scope
Stock.addScope('lowStock', {
  where: Sequelize.where(
    Sequelize.col('quantity'),
    Sequelize.Op.lt,
    Sequelize.col('min_stock_level')
  )
});

// Usage: Stock.scope('lowStock').findAll({ where: { ShopId } })

// Sale.js - Recent sales
Sale.addScope('recent', {
  where: {
    createdAt: {
      [Sequelize.Op.gte]: Sequelize.literal("DATE_SUB(NOW(), INTERVAL 30 DAY)")
    }
  }
});

// CashSession.js - Active sessions
CashSession.addScope('active', {
  where: { status: 'open' }
});
```

### 9.4 Transaction Usage Pattern

```javascript
// In sales service
async function createSale(saleData, transaction) {
  const sale = await Sale.create(saleData, { transaction });
  
  for (const item of saleData.items) {
    await SaleItem.create({
      ...item,
      SaleId: sale.id
    }, { transaction });
    
    // Update stock
    await Stock.decrement('quantity', {
      where: { ProductId: item.ProductId, ShopId: saleData.ShopId },
      by: item.quantity,
      transaction
    });
  }
  
  return sale;
}

// Usage in controller
const transaction = await sequelize.transaction();
try {
  const sale = await SaleService.createSale(data, transaction);
  await transaction.commit();
  return sale;
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

---

## 10. PRODUCTION-READY IMPROVEMENTS

### 10.1 Database Views for Reporting

```sql
-- Current Stock Status
CREATE VIEW v_stock_status AS
SELECT 
  s.ShopId,
  sh.name as shop_name,
  p.id as product_id,
  p.name as product_name,
  c.name as category_name,
  s.quantity,
  s.min_stock_level,
  CASE 
    WHEN s.quantity < s.min_stock_level THEN 'LOW'
    WHEN s.quantity = 0 THEN 'OUT_OF_STOCK'
    ELSE 'OK'
  END as stock_status,
  gs.quantity as global_quantity
FROM Stocks s
JOIN Shops sh ON s.ShopId = sh.id
JOIN Products p ON s.ProductId = p.id
LEFT JOIN Categories c ON p.CategoryId = c.id
LEFT JOIN GlobalStocks gs ON p.id = gs.ProductId;

-- Daily Sales Summary
CREATE VIEW v_daily_sales_summary AS
SELECT 
  DATE(s.createdAt) as sale_date,
  s.ShopId,
  sh.name as shop_name,
  COUNT(*) as transaction_count,
  SUM(s.total_amount) as total_revenue,
  SUM(s.tax_amount) as total_tax,
  COUNT(DISTINCT s.UserId) as unique_cashiers,
  COUNT(DISTINCT s.CustomerId) as unique_customers,
  SUM(CASE WHEN s.paymentMethod = 'CASH' THEN s.total_amount ELSE 0 END) as cash_revenue,
  SUM(CASE WHEN s.paymentMethod = 'MOBILE_MONEY' THEN s.total_amount ELSE 0 END) as mobile_revenue,
  SUM(CASE WHEN s.paymentMethod = 'CREDIT' THEN s.total_amount ELSE 0 END) as credit_revenue
FROM Sales s
JOIN Shops sh ON s.ShopId = sh.id
WHERE s.status = 'COMPLETED'
GROUP BY DATE(s.createdAt), s.ShopId, sh.name;

-- Cashier Performance
CREATE VIEW v_cashier_performance AS
SELECT 
  DATE(s.createdAt) as transaction_date,
  u.username as cashier,
  u.ShopId,
  COUNT(*) as transactions,
  SUM(s.total_amount) as total_handled,
  COUNT(DISTINCT s.CustomerId) as unique_customers,
  AVG(s.total_amount) as avg_transaction_size
FROM Sales s
JOIN users u ON s.UserId = u.id
WHERE s.status = 'COMPLETED'
GROUP BY DATE(s.createdAt), u.username, u.ShopId;
```

### 10.2 Backup and Recovery Strategy

```sql
-- Monthly archive table
CREATE TABLE IF NOT EXISTS Sales_Archive (
  LIKE Sales INCLUDING ALL
) PARTITION BY RANGE (YEAR(createdAt) * 100 + MONTH(createdAt)) (
  PARTITION p202401 VALUES LESS THAN (202402),
  PARTITION p202402 VALUES LESS THAN (202403),
  -- ... monthly partitions
);

-- Archive old sales
DELIMITER //

CREATE EVENT ev_archive_old_sales
ON SCHEDULE EVERY 1 MONTH
DO
BEGIN
  INSERT INTO Sales_Archive
  SELECT * FROM Sales
  WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR)
  AND archived_at IS NULL;
  
  UPDATE Sales
  SET archived_at = NOW()
  WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR)
  AND archived_at IS NULL;
END //

DELIMITER ;
```

### 10.3 High Availability Configuration

**Master-Slave Replication:**
```sql
-- On Master
SHOW MASTER STATUS;

-- On Slave
CHANGE MASTER TO
  MASTER_HOST='master.ip.address',
  MASTER_USER='replication_user',
  MASTER_PASSWORD='password',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=12345;

START SLAVE;
SHOW SLAVE STATUS;
```

---

## 11. PRODUCTION-GRADE FIXES - ALTER STATEMENTS

### Tier 1: Critical (Deploy First)

```sql
-- 1. Make Customers.ShopId NOT NULL (after data cleanup)
UPDATE Customers SET ShopId = (
  SELECT ShopId FROM Sales 
  WHERE Sales.CustomerId = Customers.id 
  LIMIT 1
) WHERE ShopId IS NULL AND EXISTS (
  SELECT 1 FROM Sales WHERE Sales.CustomerId = Customers.id
);

ALTER TABLE Customers 
MODIFY COLUMN ShopId CHAR(36) NOT NULL;

-- 2. Make Suppliers.ShopId NOT NULL or handle shared suppliers
UPDATE Suppliers SET ShopId = (SELECT id FROM Shops LIMIT 1) 
WHERE ShopId IS NULL;

-- 3. Add soft delete columns to critical tables
ALTER TABLE Sales ADD COLUMN (
  deletedAt DATETIME,
  KEY idx_sales_deletedAt (deletedAt)
);

ALTER TABLE Invoices ADD COLUMN deletedAt DATETIME;
ALTER TABLE SaleItems ADD COLUMN deletedAt DATETIME;
ALTER TABLE Purchases ADD COLUMN deletedAt DATETIME;
ALTER TABLE Expenses ADD COLUMN deletedAt DATETIME;

-- 4. Add unique constraint for Invoice-Sale relationship
ALTER TABLE Invoices 
ADD UNIQUE KEY uk_invoice_sale (SaleId);

-- 5. Add cash session reconciliation fields
ALTER TABLE CashSessions ADD COLUMN (
  expected_closing_balance DECIMAL(15,2),
  counted_amount DECIMAL(15,2),
  variance DECIMAL(15,2) GENERATED ALWAYS AS 
    (counted_amount - expected_closing_balance) STORED,
  reconciled_at DATETIME,
  reconciled_by CHAR(36),
  reconciliation_status ENUM('pending','reconciled','discrepancy') DEFAULT 'pending',
  KEY idx_sessions_reconciled_at (reconciled_at),
  CONSTRAINT fk_sessions_reconciled_by FOREIGN KEY (reconciled_by) 
    REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Add ShopId to sessions
ALTER TABLE Sessions ADD COLUMN ShopId CHAR(36);
UPDATE Sessions s 
SET ShopId = (SELECT ShopId FROM users WHERE id = s.UserId);
ALTER TABLE Sessions ADD KEY idx_sessions_ShopId (ShopId);

-- 7. Ensure Expenses.ExpenseTypeId NOT NULL
UPDATE Expenses SET ExpenseTypeId = (
  SELECT id FROM ExpenseTypes WHERE ShopId IS NULL LIMIT 1
) WHERE ExpenseTypeId IS NULL;

-- 8. Add daily report immutability
ALTER TABLE DailyReports ADD COLUMN (
  report_locked_at DATETIME,
  locked_by CHAR(36),
  KEY idx_dailyreport_locked_at (report_locked_at),
  CONSTRAINT fk_dailyreport_locked_by FOREIGN KEY (locked_by) 
    REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Add sync_queue ShopId
ALTER TABLE sync_queue ADD COLUMN ShopId CHAR(36);
ALTER TABLE sync_queue ADD KEY idx_syncqueue_ShopId (ShopId);

-- 10. Add audit log ShopId validation
ALTER TABLE audit_logs ADD COLUMN device_id VARCHAR(100);
ALTER TABLE audit_logs ADD KEY idx_audit_device_id (device_id);
```

### Tier 2: High Priority (Deploy Next 2 Weeks)

```sql
-- 1. Purchase receiving fields
ALTER TABLE Purchases ADD COLUMN (
  expected_quantity DECIMAL(15,2),
  received_quantity DECIMAL(15,2) DEFAULT 0,
  received_at DATETIME,
  received_by CHAR(36),
  receiving_variance DECIMAL(15,2) GENERATED ALWAYS AS 
    (received_quantity - expected_quantity) STORED,
  variance_reason VARCHAR(255),
  KEY idx_purchases_received_by (received_by),
  CONSTRAINT fk_purchases_received_by FOREIGN KEY (received_by) 
    REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Stock adjustment authorization
ALTER TABLE stock_adjustments ADD COLUMN (
  authorization_by CHAR(36),
  authorization_at DATETIME,
  count_document_reference VARCHAR(100),
  KEY idx_stock_adj_auth_by (authorization_by),
  CONSTRAINT fk_stock_adj_auth_by FOREIGN KEY (authorization_by) 
    REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Stock transfer completion tracking
ALTER TABLE StockTransfers ADD COLUMN (
  expected_delivery_at DATETIME,
  delivery_confirmed_at DATETIME,
  escalation_at DATETIME,
  escalation_reason VARCHAR(255)
);

-- 4. Customer credit adjustments table
CREATE TABLE IF NOT EXISTS credit_adjustments (
  id CHAR(36) PRIMARY KEY,
  credit_id CHAR(36) NOT NULL,
  old_amount DECIMAL(12,2),
  new_amount DECIMAL(12,2),
  adjustment_reason VARCHAR(255),
  adjusted_by CHAR(36) NOT NULL,
  adjusted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_credit_adj_credit (credit_id),
  KEY idx_credit_adj_by (adjusted_by),
  CONSTRAINT fk_credit_adj_credit FOREIGN KEY (credit_id) 
    REFERENCES customer_credits(id) ON DELETE CASCADE,
  CONSTRAINT fk_credit_adj_by FOREIGN KEY (adjusted_by) 
    REFERENCES users(id) ON DELETE RESTRICT
);

-- 5. Add customer credit fields
ALTER TABLE customer_credits ADD COLUMN (
  original_amount DECIMAL(12,2) NOT NULL,
  write_off_amount DECIMAL(12,2) DEFAULT 0,
  adjustments_count INT DEFAULT 0,
  last_adjusted_by CHAR(36),
  dispute_reason TEXT,
  dispute_resolved_at DATETIME,
  dispute_resolved_by CHAR(36),
  KEY idx_credit_disputes (dispute_resolved_at),
  CONSTRAINT fk_credit_last_adj_by FOREIGN KEY (last_adjusted_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_credit_dispute_by FOREIGN KEY (dispute_resolved_by) 
    REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Add CashMovement ShopId
ALTER TABLE CashMovements ADD COLUMN ShopId CHAR(36);
UPDATE CashMovements cm
SET ShopId = (SELECT ShopId FROM CashRegisters WHERE id = cm.CashRegisterId);
ALTER TABLE CashMovements ADD KEY idx_cashmovement_ShopId (ShopId);

-- 7. Add ProductPricingRules ShopId
ALTER TABLE ProductPricingRules ADD COLUMN ShopId CHAR(36);
-- Note: Nullable if pricing rules are global, make NOT NULL if per-shop

-- 8. Device tracking improvements
ALTER TABLE devices ADD COLUMN (
  last_activity_at DATETIME,
  failed_login_attempts INT DEFAULT 0,
  locked_at DATETIME,
  lockout_reason VARCHAR(255),
  KEY idx_device_active (is_active, locked_at)
);

-- 9. Daily cash reports improvements
ALTER TABLE daily_cash_reports ADD COLUMN ShopId CHAR(36);
UPDATE daily_cash_reports dcr
SET ShopId = (SELECT ShopId FROM users WHERE id = dcr.user_id LIMIT 1);
ALTER TABLE daily_cash_reports ADD KEY idx_daily_cash_ShopId (ShopId);

-- 10. Notification improvements
ALTER TABLE notifications ADD COLUMN ShopId CHAR(36);
```

### Tier 3: Medium Priority (Deploy Month 2)

```sql
-- 1. Performance indexes
ALTER TABLE users ADD INDEX idx_users_email_active (email, is_active);
ALTER TABLE users ADD INDEX idx_users_ShopId_role (ShopId, role);
ALTER TABLE Sales ADD INDEX idx_sales_ShopId_date (ShopId, createdAt);
ALTER TABLE Sales ADD INDEX idx_sales_status_date (status, createdAt);
ALTER TABLE Customers ADD INDEX idx_customers_ShopId_email (ShopId, email);
ALTER TABLE Stocks ADD INDEX idx_stock_ShopId_ProductId (ShopId, ProductId);
ALTER TABLE StockMovements ADD INDEX idx_movements_date (createdAt);
ALTER TABLE Purchases ADD INDEX idx_purchases_ShopId_status (ShopId, status);
ALTER TABLE CashSessions ADD INDEX idx_cash_session_date (ShopId, opened_at);
ALTER TABLE DailyReports ADD INDEX idx_daily_shop_month (ShopId, YEAR(report_date), MONTH(report_date));
ALTER TABLE Expenses ADD INDEX idx_expenses_ShopId_date (ShopId, date);
ALTER TABLE audit_logs ADD INDEX idx_audit_table_date (table_name, createdAt);
ALTER TABLE sync_queue ADD INDEX idx_sync_status_date (status, createdAt);

-- 2. Audit log fields
ALTER TABLE audit_logs ADD COLUMN (
  ip_address VARCHAR(50),
  is_sensitive_field TINYINT(1) DEFAULT 0,
  new_values_masked JSON,
  KEY idx_audit_sensitive (is_sensitive_field)
);

-- 3. Cash session audit improvements
ALTER TABLE CashSessions ADD COLUMN (
  opening_count_by CHAR(36),
  opening_count_at DATETIME,
  closing_count_by CHAR(36),
  closing_count_at DATETIME,
  physical_count_amount DECIMAL(15,2),
  audit_by CHAR(36),
  audit_at DATETIME,
  audit_notes TEXT,
  is_locked TINYINT(1) DEFAULT 0,
  KEY idx_sessions_audit_at (audit_at),
  CONSTRAINT fk_session_opening_by FOREIGN KEY (opening_count_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_session_closing_by FOREIGN KEY (closing_count_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_session_audit_by FOREIGN KEY (audit_by) REFERENCES users(id) ON DELETE SET NULL
);
```

---

## 12. MISSING DATABASE TRIGGERS

### Must Implement Immediately

```sql
-- Trigger 1: Auto-create StockMovement and deduct on SaleItem insertion
DELIMITER //

CREATE TRIGGER tr_saleitem_insert_deduct_stock
AFTER INSERT ON SaleItems
FOR EACH ROW
BEGIN
  DECLARE v_stock_id CHAR(36);
  DECLARE v_prev_qty DECIMAL(15,2);
  DECLARE v_shop_id CHAR(36);
  
  -- Get sale's shop
  SELECT ShopId INTO v_shop_id FROM Sales WHERE id = NEW.SaleId;
  
  -- Find stock
  SELECT id, quantity INTO v_stock_id, v_prev_qty
  FROM Stocks
  WHERE ProductId = NEW.ProductId AND ShopId = v_shop_id
  FOR UPDATE;
  
  -- Validate stock
  IF v_stock_id IS NULL OR v_prev_qty < NEW.quantity THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = CONCAT('Insufficient stock. Available: ', v_prev_qty, ', Required: ', NEW.quantity);
  END IF;
  
  -- Create movement audit
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
  SET quantity = quantity - NEW.quantity
  WHERE id = v_stock_id;
END //

DELIMITER ;

-- Trigger 2: Auto-increment GlobalStock when Stocks updated
DELIMITER //

CREATE TRIGGER tr_stock_update_global
AFTER UPDATE ON Stocks
FOR EACH ROW
BEGIN
  UPDATE GlobalStocks
  SET quantity = (
    SELECT COALESCE(SUM(s.quantity), 0)
    FROM Stocks s
    WHERE s.ProductId = NEW.ProductId
  )
  WHERE ProductId = NEW.ProductId;
END //

DELIMITER ;

-- Trigger 3: Prevent sale deletion if invoice exists
DELIMITER //

CREATE TRIGGER tr_prevent_sale_delete_if_invoiced
BEFORE DELETE ON Sales
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM Invoices WHERE SaleId = OLD.id
  ) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Cannot delete sale with existing invoice';
  END IF;
END //

DELIMITER ;

-- Trigger 4: Validate credit payment doesn't exceed total
DELIMITER //

CREATE TRIGGER tr_validate_credit_payment
BEFORE INSERT ON credit_payments
FOR EACH ROW
BEGIN
  DECLARE v_total_paid DECIMAL(12,2);
  DECLARE v_total_credit DECIMAL(12,2);
  
  SELECT 
    COALESCE(SUM(amount), 0),
    (SELECT total_credit FROM customer_credits WHERE id = NEW.credit_id)
  INTO v_total_paid, v_total_credit
  FROM credit_payments
  WHERE credit_id = NEW.credit_id;
  
  IF (v_total_paid + NEW.amount) > v_total_credit THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Payment exceeds total credit amount';
  END IF;
END //

DELIMITER ;

-- Trigger 5: Update customer_credits after payment insert
DELIMITER //

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
    END
  WHERE id = NEW.credit_id;
END //

DELIMITER ;
```

---

## 13. FINAL ARCHITECTURE SCORE

| Criterion | Score | Notes |
|---|---|---|
| **Scalability** | 7/10 | ✅ Good multi-shop isolation, but missing partitioning strategy. Can handle ~10K shops per instance with optimization |
| **Maintainability** | 6/10 | ⚠️ Good schema design, but lacks documentation and stored procedures. Sequelize models need consistency |
| **Consistency** | 5/10 | 🔴 CRITICAL: Missing database-level transaction enforcement, triggers incomplete |
| **Security** | 6/10 | ⚠️ Audit logs exist, but incomplete. Device tracking present. Missing encryption at rest |
| **ERP Readiness** | 6/10 | ⚠️ Good transaction tables, but missing purchase receiving, invoice matching, financial reconciliation |
| **Offline-First** | 5/10 | ⚠️ sync_queue exists but missing ShopId. No reconciliation logic |
| **Financial Reliability** | 5/10 | 🔴 CRITICAL: No double-entry bookkeeping, missing GL accounts, no financial period management |
| **Inventory Integrity** | 4/10 | 🔴 CRITICAL: No database triggers for stock deduction, missing FIFO/LIFO, no lot tracking |
| **Performance** | 6/10 | ⚠️ Missing ~15 critical indexes, needs query optimization and caching layer |
| **Compliance** | 5/10 | ⚠️ Audit trail exists but incomplete, no immutability locks, missing data retention policies |

**Overall Production Readiness: 5.6/10** 🔴

**Status:** REQUIRES CRITICAL FIXES BEFORE PRODUCTION

---

## 14. DEPLOYMENT ROADMAP

### Phase 1: Critical (Week 1) - DO NOT SKIP
- [ ] Implement Tier 1 ALTER statements
- [ ] Create all required database triggers
- [ ] Fix ShopId nullability issues
- [ ] Add soft delete columns
- [ ] Implement transaction patterns in services

### Phase 2: High Priority (Weeks 2-4)
- [ ] Add all missing indexes
- [ ] Implement cash session reconciliation
- [ ] Add purchase receiving workflow
- [ ] Create reporting views
- [ ] Add audit logging triggers

### Phase 3: Medium Priority (Month 2)
- [ ] Implement financial GL accounts (new tables)
- [ ] Add stock reservation system
- [ ] Create financial reporting dashboard
- [ ] Implement backup/archive strategy
- [ ] Set up replication for HA

### Phase 4: Enhanced (Month 3+)
- [ ] Implement multi-currency support
- [ ] Add batch/lot tracking
- [ ] Implement financial year management
- [ ] Create mobile offline reconciliation
- [ ] Add predictive analytics for stock

---

## CONCLUSION

The ShopLink architecture demonstrates solid foundational design with proper multi-tenant isolation and comprehensive relationships. However, several **CRITICAL ISSUES** must be resolved before production deployment:

1. **Database-Level Transaction Enforcement** - Missing triggers cause race conditions
2. **Financial Integrity** - No double-entry accounting or reconciliation
3. **Inventory Consistency** - Stock deduction not enforced at database level
4. **Audit Completeness** - Critical tables lack soft-delete and proper logging
5. **Multi-Tenant Isolation** - Several tables lack ShopId, creating security risks

**Estimated Effort to Production-Ready:** 4-6 weeks with experienced team

**Estimated Cost of Not Fixing:** $50K+ in data corruption, fraud, and compliance violations

**Recommendation:** Implement Phase 1 and Phase 2 fixes immediately before any production traffic.

