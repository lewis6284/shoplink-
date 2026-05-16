# ShopLink Database Architecture Audit Report

## Executive Summary
This audit compares the existing SQL schema (`db.sql`) with Sequelize model definitions to identify schema mismatches, missing relationships, and foreign key constraints. The application is a multi-tenant ERP system with shop-based isolation and RBAC roles.

---

## ARCHITECTURE PROBLEMS FOUND

### 1. **ID Type Inconsistencies**
- **Problem**: Models use `DataTypes.CHAR(36)` or `DataTypes.UUID` inconsistently; some models use `CHAR(36)`, others use `UUID`.
- **Impact**: May cause implicit type conversions; foreign key constraints fail silently.
- **Example**: 
  - `User.id` → `CHAR(36)` in model
  - `Shop.id` → `CHAR(36)` in model
  - `Sale.id` → `UUID` in model (mismatch!)
  - `SaleItem.ProductId` → `UUID` in model but references `Product.id` as `CHAR(36)`
- **Severity**: HIGH

### 2. **Expense Model Missing ExpenseTypeId Reference**
- **Problem**: Expense table in `db.sql` has `ExpenseTypeId` foreign key, but `Expense.js` model does NOT define this field.
- **Impact**: Cannot persist expense type relationships; frontend form uses ExpenseTypeId but backend rejects it.
- **Current Model**: Only has `description`, `amount`, `date`, `ShopId`, `UserId`.
- **Expected**: Should include `ExpenseTypeId` with foreign key to `ExpenseTypes`.
- **Severity**: HIGH

### 3. **ExpenseCategory vs ExpenseType Table Naming Mismatch**
- **Problem**: 
  - Model is named `ExpenseCategory` with table `expense_categories`
  - SQL schema uses table `ExpenseTypes`
  - These are NOT the same concept
- **Impact**: Sequelize won't sync; data migrations break; API endpoints confused.
- **Severity**: CRITICAL

### 4. **Missing Foreign Keys in db.sql**
- **Problem**: Many tables have ShopId, UserId, but NO foreign key constraints defined.
- **Example**:
  - `Shops` table → no FK to `users`
  - `Stock` → no FK to `Shops` or `Products`
  - `Customers` → no FK to `Shops`
  - `Suppliers` → no FK to `Shops`
  - `CashRegisters` → no FK to `Shops`
  - `CashSessions` → no FK to `CashRegisters`, `Users`, `Shops`
  - `DailyReports` → no FK to `Shops`
  - `audit_logs` → no FK to `users` or `Shops`
- **Impact**: Data integrity issues; orphaned records; impossible to enforce multi-shop isolation.
- **Severity**: CRITICAL

### 5. **Missing Unique Constraints**
- **Problem**: Several models define UNIQUE constraints that db.sql doesn't have.
- **Example**:
  - `Product.barcode` → UNIQUE in model but not indexed in db.sql
  - `DailyReport` → unique composite index `(ShopId, report_date)` exists in model but not in db.sql
  - `Stock` → unique composite index `(ProductId, ShopId)` exists in model but not in db.sql
- **Severity**: MEDIUM

### 6. **Customer Table Missing Fields**
- **Problem**: Sequelize `Customer.js` model has fields not in db.sql:
  - `address` (model has it, schema doesn't)
  - `loyalty_points` (model has it, schema doesn't)
  - `credit_balance` (model has it, schema doesn't)
  - `type` (ENUM 'normal'/'partner' in model, schema uses `customer_type`)
- **Impact**: Frontend can't store/retrieve customer data properly.
- **Severity**: HIGH

### 7. **Missing ShopId on Critical Tables**
- **Problem**: 
  - `Users` table has `ShopId` but not isolated properly
  - Some global lookup tables missing ShopId (e.g., `Units`, `Settings`)
  - `ExpenseTypes` table missing `ShopId` (should be per-shop)
  - `Categories` table missing `ShopId` (should be per-shop or global?)
  - `Brands` table missing `ShopId` (should be per-shop or global?)
- **Impact**: Multi-tenant isolation breaks; cross-shop data leakage possible.
- **Severity**: HIGH

### 8. **Missing Relationships**
- **Problem**: Many associations defined in models but not represented as FK constraints in db.sql:
  - `UserShop` → pivot table exists but no FK constraints
  - `ProductImage` → no FK constraint in db.sql
  - `StockTransfer` → references `FromShopId`, `ToShopId`, `CreatedBy`, `ApprovedBy`, `ReceivedBy`; db.sql missing most of these
  - `CashMovement` → no FK to `CashRegister`
  - `CashSession` → no FK to `CashRegister`, `User`, `Shop`
  - `CustomerCredit` → no FK to `Customer` or `Sale`
  - `CreditPayment` → no FK to `CustomerCredit`
  - `StockAdjustment` → no FK to `Product` or `User`
  - `StockMovement` → no FK to `Stock`
  - `DailyCashReport` → no FK to `User`
  - `Device` → no FK to `User`
- **Severity**: CRITICAL

### 9. **Timestamps Inconsistencies**
- **Problem**: Models have different timestamp configurations:
  - Some use `timestamps: true` (createdAt, updatedAt)
  - Some use `timestamps: false`
  - Some use `updatedAt: false` with `createdAt: true`
  - Mixed `createdAt` and `createdAt` column naming
- **Example**: `DailyReport` has `createdAt`, `updatedAt` in model but `generated_at`, `created_at`, `updated_at` in db.sql
- **Severity**: MEDIUM

### 10. **CashRegister Model Mismatch**
- **Problem**: 
  - Model defines `CashRegister.balance` with only ShopId
  - db.sql has `UserId`, `opening_balance`, `closing_balance`, `opened_at`, `closed_at` (fields for register sessions, not the register itself)
  - This looks like `CashRegister` should store the device/drawer, NOT session data
- **Impact**: Cash flow tracking architecture confused.
- **Severity**: HIGH

### 11. **Missing Tables in Sequelize Models**
- **Problem**: db.sql has tables with no corresponding Sequelize model:
  - `ExpenseTypes` (there's `ExpenseCategory` model but wrong table name/structure)
  - `Notifications` table schema missing from controllers/usage
  - `Devices` model and table exist but may not be fully integrated
- **Severity**: MEDIUM

### 12. **Primary Key Type Inconsistency**
- **Problem**: Some models use `UUID` (random), others use `CHAR(36)` with UUIDV4 default:
  - Should standardize: all should be `CHAR(36)` with `UUIDV4` default for MySQL compatibility
- **Severity**: MEDIUM

### 13. **Missing NOT NULL Constraints**
- **Problem**: Several critical fields are nullable when they shouldn't be:
  - `Users.ShopId` → nullable (by design for owners), but NOT distinguished from managers/cashiers
  - `Stock.ProductId`, `Stock.ShopId` → nullable in model (should be required)
  - `Sale.CustomerId` → nullable (OK for cash sales but should be documented)
  - `Purchase.SupplierId` → nullable (should be required)
  - Many ShopId fields → nullable but required for multi-tenant isolation
- **Severity**: MEDIUM

---

## RELATIONSHIP FIXES REQUIRED

### Fix 1: Expense → ExpenseType (Critical)
```
Models: Expense.js, ExpenseCategory.js (RENAME to ExpenseType.js)
Foreign Key: Expense.ExpenseTypeId → ExpenseType.id
Action: 
  - Rename model from ExpenseCategory to ExpenseType
  - Change table from expense_categories to ExpenseTypes (or expense_types)
  - Add ExpenseTypeId field to Expense model
  - Add FK constraint in db.sql
```

### Fix 2: User → Shop (One-to-Many for non-owners)
```
Relationship: User.ShopId → Shop.id
Current: User.ShopId exists but no FK constraint
Action:
  - Add FK constraint: users.ShopId → Shops.id (with ON DELETE SET NULL)
  - Document: ShopId NULL means owner account, non-null means cashier/manager
  - Add UNIQUE(ShopId, username) for user uniqueness per shop
```

### Fix 3: CashRegister → Shop (Many-to-One)
```
Relationship: CashRegister.ShopId → Shop.id
Current: Exists in model but no FK in db.sql
Action: Add FK constraint: CashRegisters.ShopId → Shops.id
```

### Fix 4: CashSession → CashRegister, User, Shop
```
Current: Model references all three, but db.sql missing FK
Action:
  - Add FK: CashSessions.CashRegisterId → CashRegisters.id
  - Add FK: CashSessions.UserId → users.id (ON DELETE SET NULL)
  - Add FK: CashSessions.ShopId → Shops.id
```

### Fix 5: CashMovement → CashRegister
```
Current: Model has FK reference, db.sql missing
Action: Add FK: CashMovements.CashRegisterId → CashRegisters.id
```

### Fix 6: Stock → Shop + Product
```
Current: Model has unique index on (ProductId, ShopId), but no FK
Action:
  - Add FK: Stocks.ShopId → Shops.id
  - Add FK: Stocks.ProductId → Products.id
  - Add UNIQUE constraint: (ShopId, ProductId)
```

### Fix 7: Stock → GlobalStock (One-to-One reverse)
```
Current: Product.hasOne(GlobalStock) but no inverse on GlobalStock
Action: Add reverse relationship in GlobalStock model
```

### Fix 8: DailyReport → Shop
```
Current: Model has FK, db.sql missing; has unique composite index
Action:
  - Add FK: DailyReports.ShopId → Shops.id
  - Ensure UNIQUE INDEX on (ShopId, report_date)
```

### Fix 9: StockTransfer → User (3-way)
```
Relationship: CreatedBy, ApprovedBy, ReceivedBy → users.id
Current: Model references all; db.sql missing
Action: Add three FK constraints with proper naming
```

### Fix 10: Product → Category + Brand + Supplier
```
Current: Model has FK references, db.sql missing
Action:
  - Add FK: Products.CategoryId → Categories.id
  - Add FK: Products.BrandId → Brands.id
  - Add FK: Products.SupplierId → Suppliers.id (ON DELETE SET NULL)
```

### Fix 11: Invoice → Sale + Shop + User
```
Current: Model defines all, db.sql missing FK
Action:
  - Add FK: Invoices.SaleId → Sales.id
  - Add FK: Invoices.ShopId → Shops.id
  - Add FK: Invoices.UserId → users.id
```

### Fix 12: SaleItem → Sale + Product
```
Current: Model has FK, db.sql missing
Action:
  - Add FK: SaleItems.SaleId → Sales.id
  - Add FK: SaleItems.ProductId → Products.id
```

### Fix 13: Sale → CashSession + Customer + User
```
Current: Model defines all, db.sql missing FK
Action:
  - Add FK: Sales.CashSessionId → CashSessions.id (ON DELETE SET NULL)
  - Add FK: Sales.CustomerId → Customers.id (ON DELETE SET NULL)
  - Add FK: Sales.UserId → users.id
```

### Fix 14: Purchase + PurchaseItem → Supplier + Product
```
Current: Model has FK, db.sql missing
Action:
  - Add FK: Purchases.SupplierId → Suppliers.id
  - Add FK: PurchaseItems.PurchaseId → Purchases.id
  - Add FK: PurchaseItems.ProductId → Products.id
```

### Fix 15: UserShop → User + Shop
```
Current: Model defines relationships, db.sql missing FK
Action:
  - Add FK: UserShops.UserId → users.id
  - Add FK: UserShops.ShopId → Shops.id
  - Add UNIQUE constraint: (UserId, ShopId)
```

### Fix 16: ShopFinancial → Shop
```
Current: Model has ShopId unique, db.sql missing FK
Action:
  - Add FK: ShopFinancials.ShopId → Shops.id (UNIQUE)
```

### Fix 17: Device → User
```
Current: Model references User, db.sql missing FK
Action: Add FK: devices.user_id → users.id
```

### Fix 18: CustomerCredit + CreditPayment → Customer + Sale
```
Current: Model defines all, db.sql missing FK
Action:
  - Add FK: customer_credits.customer_id → Customers.id
  - Add FK: customer_credits.sale_id → Sales.id (ON DELETE SET NULL)
  - Add FK: credit_payments.credit_id → customer_credits.id
```

### Fix 19: DailyCashReport → User
```
Current: Model references User, db.sql missing FK
Action: Add FK: daily_cash_reports.user_id → users.id
```

### Fix 20: StockAdjustment → Product + User
```
Current: Model references both, db.sql missing FK
Action:
  - Add FK: stock_adjustments.product_id → Products.id
  - Add FK: stock_adjustments.user_id → users.id
```

### Fix 21: StockMovement → Stock
```
Current: Model references Stock, db.sql missing FK
Action: Add FK: StockMovements.StockId → Stocks.id
```

### Fix 22: ProductImage → Product
```
Current: Model references Product, db.sql missing
Action: Add FK: product_images.ProductId → Products.id
```

### Fix 23: Expense → ExpenseType + Shop + User
```
Current: Model missing ExpenseTypeId; FK missing for all
Action:
  - Add ExpenseTypeId field to Expense model
  - Add FK: Expenses.ExpenseTypeId → ExpenseTypes.id
  - Add FK: Expenses.ShopId → Shops.id
  - Add FK: Expenses.UserId → users.id
```

### Fix 24: AuditLog → User + Shop
```
Current: Model defines ShopId, user_id; db.sql missing FK
Action:
  - Add FK: audit_logs.user_id → users.id (ON DELETE SET NULL)
  - Add FK: audit_logs.ShopId → Shops.id (ON DELETE SET NULL)
```

---

## MISSING FOREIGN KEYS

| Table | Column | References | Current Status |
|-------|--------|------------|-----------------|
| Stocks | ShopId | Shops.id | ❌ Missing |
| Stocks | ProductId | Products.id | ❌ Missing |
| Stock | Composite UK | (ProductId, ShopId) | ❌ Missing |
| Sales | ShopId | Shops.id | ❌ Missing |
| Sales | UserId | users.id | ❌ Missing |
| Sales | CashSessionId | CashSessions.id | ❌ Missing |
| Sales | CustomerId | Customers.id | ❌ Missing |
| Sales | Composite UK | (idempotency_key) | ✅ Present |
| SaleItems | SaleId | Sales.id | ❌ Missing |
| SaleItems | ProductId | Products.id | ❌ Missing |
| StockTransfers | ProductId | Products.id | ❌ Missing |
| StockTransfers | FromShopId | Shops.id | ❌ Missing |
| StockTransfers | ToShopId | Shops.id | ❌ Missing |
| StockTransfers | CreatedBy | users.id | ❌ Missing |
| StockTransfers | ApprovedBy | users.id | ❌ Missing |
| StockTransfers | ReceivedBy | users.id | ❌ Missing |
| Customers | ShopId | Shops.id | ❌ Missing |
| Expenses | ExpenseTypeId | ExpenseTypes.id | ❌ MISSING FIELD + FK |
| Expenses | ShopId | Shops.id | ❌ Missing |
| Expenses | UserId | users.id | ❌ Missing |
| Invoices | SaleId | Sales.id | ❌ Missing |
| Invoices | ShopId | Shops.id | ❌ Missing |
| Invoices | UserId | users.id | ❌ Missing |
| Products | CategoryId | Categories.id | ❌ Missing |
| Products | BrandId | Brands.id | ❌ Missing |
| Products | SupplierId | Suppliers.id | ❌ Missing |
| GlobalStocks | ProductId | Products.id | ❌ Missing (UNIQUE) |
| Suppliers | ShopId | Shops.id | ❌ Missing |
| Purchases | SupplierId | Suppliers.id | ❌ Missing |
| Purchases | ShopId | Shops.id | ❌ Missing |
| PurchaseItems | PurchaseId | Purchases.id | ❌ Missing |
| PurchaseItems | ProductId | Products.id | ❌ Missing |
| ProductPricingRules | ProductId | Products.id | ❌ Missing |
| UserShops | UserId | users.id | ❌ Missing |
| UserShops | ShopId | Shops.id | ❌ Missing |
| UserShops | Composite UK | (UserId, ShopId) | ❌ Missing |
| ShopFinancials | ShopId | Shops.id | ❌ Missing (UNIQUE) |
| CashRegisters | ShopId | Shops.id | ❌ Missing |
| CashSessions | CashRegisterId | CashRegisters.id | ❌ Missing |
| CashSessions | UserId | users.id | ❌ Missing |
| CashSessions | ShopId | Shops.id | ❌ Missing |
| CashMovements | CashRegisterId | CashRegisters.id | ❌ Missing |
| DailyReports | ShopId | Shops.id | ❌ Missing |
| DailyReports | Composite UK | (ShopId, report_date) | ✅ Present (as idx, not UK) |
| DailyCashReports | UserId | users.id | ❌ Missing |
| audit_logs | user_id | users.id | ❌ Missing |
| audit_logs | ShopId | Shops.id | ❌ Missing |
| users | ShopId | Shops.id | ❌ Missing |
| devices | user_id | users.id | ❌ Missing |
| customer_credits | customer_id | Customers.id | ❌ Missing |
| customer_credits | sale_id | Sales.id | ❌ Missing |
| credit_payments | credit_id | customer_credits.id | ❌ Missing |
| stock_adjustments | product_id | Products.id | ❌ Missing |
| stock_adjustments | user_id | users.id | ❌ Missing |
| StockMovements | StockId | Stocks.id | ❌ Missing |
| product_images | ProductId | Products.id | ❌ Missing |

---

## UPDATED ASSOCIATIONS

All Sequelize model associations should be verified and aligned. Key associations:

1. **One-to-Many**: Shop → Users, Shops → Stocks, Shops → Sales, Shops → Customers, Suppliers → Purchases, Products → SaleItems, Products → PurchaseItems
2. **Many-to-One**: User → Shop, Stock → Shop, Sale → Shop, Sale → User, Sale → Customer, Sale → CashSession
3. **Many-to-Many (Pivot)**: User ↔ Shop via UserShops
4. **One-to-One**: Product ↔ GlobalStock, ShopFinancial ↔ Shop, DailyReport ↔ Shop (composite key)

---

## FINAL PRODUCTION-READY db.sql

See `/DATABASE_SCHEMA_PRODUCTION.sql` for the complete, corrected schema with:
- All foreign key constraints
- All unique constraints
- Proper timestamps and defaults
- Multi-tenant ShopId isolation
- Audit logging support
- Cash management workflow support
- Full product lifecycle support

