# ShopLink - Sequelize Model Improvements & Best Practices
## Production-Grade Implementation Guide

---

## 1. RECOMMENDED MODEL ASSOCIATIONS

### User.js - Complete Associations
```javascript
class User extends Model {}

User.init({
  // ... existing fields
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  paranoid: false, // Owner and system users shouldn't be soft-deleted
  timestamps: true
});

// ========== ASSOCIATIONS ==========

// One User → Many Sessions
User.hasMany(Session, {
  foreignKey: 'UserId',
  onDelete: 'CASCADE',
  as: 'sessions'
});

// One User → Many Devices
User.hasMany(Device, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  as: 'devices'
});

// One User → Many Stock Adjustments
User.hasMany(StockAdjustment, {
  foreignKey: 'user_id',
  onDelete: 'SET NULL',
  as: 'stock_adjustments'
});

// One User → Many Audit Logs
User.hasMany(AuditLog, {
  foreignKey: 'user_id',
  onDelete: 'SET NULL',
  as: 'audit_logs_created'
});

// One User → Many Sales (as cashier)
User.hasMany(Sale, {
  foreignKey: 'UserId',
  onDelete: 'RESTRICT',
  as: 'sales_created'
});

// One User → Many Stock Transfers (as creator)
User.hasMany(StockTransfer, {
  foreignKey: 'CreatedBy',
  onDelete: 'RESTRICT',
  as: 'transfers_created'
});

// One User → One Shop (nullable for owners)
User.belongsTo(Shop, {
  foreignKey: 'ShopId',
  onDelete: 'SET NULL',
  as: 'primary_shop'
});

// Many Users ↔ Many Shops (via UserShops)
User.belongsToMany(Shop, {
  through: 'UserShops',
  foreignKey: 'UserId',
  otherKey: 'ShopId',
  as: 'shops'
});

module.exports = User;
```

### Shop.js - Complete Associations
```javascript
class Shop extends Model {}

Shop.init({
  // ... existing fields
  deletedAt: DataTypes.DATE  // Support paranoid soft delete
}, {
  sequelize,
  modelName: 'Shop',
  tableName: 'Shops',
  paranoid: true,  // Shops can be soft-deleted
  timestamps: true
});

// ========== ASSOCIATIONS ==========

// One Shop → Many Users
Shop.hasMany(User, {
  foreignKey: 'ShopId',
  onDelete: 'SET NULL',
  as: 'users'
});

// One Shop → Many Stocks
Shop.hasMany(Stock, {
  foreignKey: 'ShopId',
  onDelete: 'CASCADE',
  as: 'stocks'
});

// One Shop → Many Sales
Shop.hasMany(Sale, {
  foreignKey: 'ShopId',
  onDelete: 'CASCADE',
  as: 'sales'
});

// One Shop → Many Purchases
Shop.hasMany(Purchase, {
  foreignKey: 'ShopId',
  onDelete: 'CASCADE',
  as: 'purchases'
});

// One Shop → Many Expenses
Shop.hasMany(Expense, {
  foreignKey: 'ShopId',
  onDelete: 'CASCADE',
  as: 'expenses'
});

// One Shop → Many Customers
Shop.hasMany(Customer, {
  foreignKey: 'ShopId',
  onDelete: 'CASCADE',
  as: 'customers'
});

// One Shop → Many CashRegisters
Shop.hasMany(CashRegister, {
  foreignKey: 'ShopId',
  onDelete: 'CASCADE',
  as: 'cash_registers'
});

// One Shop → Many CashSessions
Shop.hasMany(CashSession, {
  foreignKey: 'ShopId',
  onDelete: 'CASCADE',
  as: 'cash_sessions'
});

// One Shop → One ShopFinancial
Shop.hasOne(ShopFinancial, {
  foreignKey: 'ShopId',
  onDelete: 'CASCADE',
  as: 'financial'
});

// One Shop → Many DailyReports
Shop.hasMany(DailyReport, {
  foreignKey: 'ShopId',
  onDelete: 'CASCADE',
  as: 'daily_reports'
});

// Many Shops ↔ Many Users (via UserShops)
Shop.belongsToMany(User, {
  through: 'UserShops',
  foreignKey: 'ShopId',
  otherKey: 'UserId',
  as: 'staff'
});

module.exports = Shop;
```

### Sale.js - Complete with Paranoid Support
```javascript
class Sale extends Model {}

Sale.init({
  // ... existing fields
  deletedAt: DataTypes.DATE,
  deletion_reason: DataTypes.STRING,
  deleted_by: DataTypes.CHAR(36)
}, {
  sequelize,
  modelName: 'Sale',
  tableName: 'Sales',
  paranoid: true,  // CRITICAL: Soft delete financial records
  timestamps: true
});

// ========== ASSOCIATIONS ==========

// One Sale → Many SaleItems
Sale.hasMany(SaleItem, {
  foreignKey: 'SaleId',
  onDelete: 'CASCADE',
  as: 'items'
});

// One Sale → One Invoice
Sale.hasOne(Invoice, {
  foreignKey: 'SaleId',
  onDelete: 'CASCADE',
  as: 'invoice'
});

// One Sale → One CustomerCredit (optional)
Sale.hasOne(CustomerCredit, {
  foreignKey: 'sale_id',
  onDelete: 'SET NULL',
  as: 'credit'
});

// One Sale ← One Shop
Sale.belongsTo(Shop, {
  foreignKey: 'ShopId',
  as: 'shop'
});

// One Sale ← One User (cashier)
Sale.belongsTo(User, {
  foreignKey: 'UserId',
  as: 'cashier'
});

// One Sale ← One CashSession (nullable)
Sale.belongsTo(CashSession, {
  foreignKey: 'CashSessionId',
  as: 'cash_session'
});

// One Sale ← One Customer (nullable)
Sale.belongsTo(Customer, {
  foreignKey: 'CustomerId',
  as: 'customer'
});

// ========== HOOKS ==========

// Validate sale has items before save
Sale.addHook('beforeCreate', async (sale, options) => {
  if (!sale.idempotency_key) {
    sale.idempotency_key = crypto.randomUUID();
  }
});

// Prevent deletion if invoiced
Sale.addHook('beforeDestroy', async (sale, options) => {
  const invoice = await Invoice.findOne({
    where: { SaleId: sale.id },
    paranoid: false  // Check even soft-deleted
  });
  
  if (invoice && !options.force) {
    throw new Error('Cannot delete sale with existing invoice');
  }
});

// ========== SCOPES ==========

Sale.addScope('recent', {
  where: {
    createdAt: {
      [Sequelize.Op.gte]: Sequelize.literal(
        "DATE_SUB(NOW(), INTERVAL 30 DAY)"
      )
    }
  }
});

Sale.addScope('completed', {
  where: { status: 'COMPLETED' }
});

Sale.addScope('byShop', (shopId) => ({
  where: { ShopId: shopId }
}));

Sale.addScope('byPaymentMethod', (method) => ({
  where: { paymentMethod: method }
}));

module.exports = Sale;
```

### Stock.js - Inventory Safety
```javascript
class Stock extends Model {}

Stock.init({
  // ... existing fields
}, {
  sequelize,
  modelName: 'Stock',
  tableName: 'Stocks',
  timestamps: false,  // Inventory updates frequently, low timestamps value
  indexes: [
    {
      unique: true,
      fields: ['ProductId', 'ShopId']
    }
  ]
});

// ========== ASSOCIATIONS ==========

Stock.hasMany(StockMovement, {
  foreignKey: 'StockId',
  onDelete: 'CASCADE',
  as: 'movements'
});

Stock.belongsTo(Shop, {
  foreignKey: 'ShopId',
  as: 'shop'
});

Stock.belongsTo(Product, {
  foreignKey: 'ProductId',
  as: 'product'
});

// ========== HOOKS ==========

// Prevent negative stock
Stock.addHook('beforeUpdate', async (stock) => {
  if (stock.quantity < 0) {
    throw new Error('Stock cannot be negative');
  }
  
  if (stock.quantity < stock.min_stock_level) {
    // TODO: Trigger low-stock notification
  }
});

// ========== SCOPES ==========

Stock.addScope('lowStock', {
  where: Sequelize.where(
    Sequelize.col('quantity'),
    Sequelize.Op.lt,
    Sequelize.col('min_stock_level')
  )
});

Stock.addScope('outOfStock', {
  where: { quantity: 0 }
});

Stock.addScope('byShop', (shopId) => ({
  where: { ShopId: shopId }
}));

module.exports = Stock;
```

### CashSession.js - Financial Safety
```javascript
class CashSession extends Model {}

CashSession.init({
  // ... existing fields
  expected_closing_balance: DataTypes.DECIMAL(15, 2),
  counted_amount: DataTypes.DECIMAL(15, 2),
  variance: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.counted_amount - this.expected_closing_balance;
    }
  },
  reconciliation_status: {
    type: DataTypes.ENUM('pending', 'reconciled', 'discrepancy'),
    defaultValue: 'pending'
  }
}, {
  sequelize,
  modelName: 'CashSession',
  tableName: 'CashSessions',
  timestamps: true
});

// ========== ASSOCIATIONS ==========

CashSession.hasMany(Sale, {
  foreignKey: 'CashSessionId',
  onDelete: 'SET NULL',
  as: 'sales'
});

CashSession.hasMany(CashMovement, {
  foreignKey: 'CashRegisterId',
  onDelete: 'CASCADE',
  as: 'movements'
});

CashSession.belongsTo(CashRegister, {
  foreignKey: 'CashRegisterId',
  as: 'register'
});

CashSession.belongsTo(User, {
  foreignKey: 'UserId',
  as: 'cashier'
});

CashSession.belongsTo(Shop, {
  foreignKey: 'ShopId',
  as: 'shop'
});

// ========== HOOKS ==========

// Prevent closing without reconciliation
CashSession.addHook('beforeUpdate', async (session, options) => {
  if (session.changed('status') && session.status === 'closed') {
    if (session.reconciliation_status !== 'reconciled' && !options.force) {
      throw new Error('Cannot close session without reconciliation');
    }
    session.closed_at = new Date();
  }
});

// Prevent editing closed sessions
CashSession.addHook('beforeUpdate', async (session) => {
  const original = await CashSession.findByPk(session.id);
  
  if (original.status === 'closed') {
    throw new Error('Cannot modify closed cash session');
  }
});

// ========== SCOPES ==========

CashSession.addScope('active', {
  where: { status: 'open' }
});

CashSession.addScope('byShop', (shopId) => ({
  where: { ShopId: shopId }
}));

module.exports = CashSession;
```

---

## 2. TRANSACTION PATTERNS (Critical for Data Consistency)

### Pattern 1: Create Sale with Items and Stock Deduction
```javascript
async function createSale(saleData, transaction = null) {
  const t = transaction || await sequelize.transaction();
  
  try {
    // 1. Create Sale record
    const sale = await Sale.create({
      ShopId: saleData.ShopId,
      UserId: saleData.UserId,
      CashSessionId: saleData.CashSessionId,
      CustomerId: saleData.CustomerId,
      subtotal: saleData.subtotal,
      tax_amount: saleData.tax_amount,
      total_amount: saleData.total_amount,
      tax_type: saleData.tax_type,
      paymentMethod: saleData.paymentMethod,
      status: 'COMPLETED',
      idempotency_key: saleData.idempotency_key || crypto.randomUUID()
    }, { transaction: t });
    
    // 2. Create SaleItems (triggers will deduct stock)
    for (const item of saleData.items) {
      await SaleItem.create({
        SaleId: sale.id,
        ProductId: item.ProductId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subTotal: item.subTotal,
        unitCostSnapshot: item.unitCostSnapshot
      }, { transaction: t });
      // ← Database trigger tr_saleitem_insert_deduct_stock handles stock deduction
    }
    
    // 3. Create Invoice (if needed)
    if (saleData.generateInvoice) {
      await Invoice.create({
        SaleId: sale.id,
        ShopId: sale.ShopId,
        UserId: sale.UserId,
        invoice_number: generateInvoiceNumber(), // Your function
        subtotal: sale.subtotal,
        tax_type: sale.tax_type,
        tax_amount: sale.tax_amount,
        total_amount: sale.total_amount,
        status: 'GENERATED'
      }, { transaction: t });
    }
    
    // 4. Create Credit (if customer paying on credit)
    if (saleData.paymentMethod === 'CREDIT' && saleData.CustomerId) {
      await CustomerCredit.create({
        customer_id: saleData.CustomerId,
        sale_id: sale.id,
        total_credit: sale.total_amount,
        original_amount: sale.total_amount,
        remaining_credit: sale.total_amount,
        status: 'pending'
      }, { transaction: t });
    }
    
    // 5. Update shop financials
    await ShopFinancial.increment('total_sales', {
      by: sale.total_amount,
      where: { ShopId: sale.ShopId },
      transaction: t
    });
    
    // Commit transaction
    if (!transaction) {
      await t.commit();
    }
    
    return sale;
    
  } catch (error) {
    if (!transaction) {
      await t.rollback();
    }
    throw error;
  }
}

// Usage
const saleData = {
  ShopId: 'shop-123',
  UserId: 'user-456',
  items: [
    { ProductId: 'prod-1', quantity: 2, unitPrice: 100, subTotal: 200, unitCostSnapshot: 50 }
  ],
  subtotal: 200,
  tax_amount: 20,
  total_amount: 220,
  tax_type: 'TVA',
  paymentMethod: 'CASH',
  generateInvoice: true
};

await createSale(saleData);
```

### Pattern 2: Close Cash Session with Reconciliation
```javascript
async function closeCashSession(sessionId, countData, transaction = null) {
  const t = transaction || await sequelize.transaction();
  
  try {
    const session = await CashSession.findByPk(sessionId, { 
      transaction: t 
    });
    
    if (!session) {
      throw new Error('Cash session not found');
    }
    
    if (session.status === 'closed') {
      throw new Error('Session already closed');
    }
    
    // Calculate expected closing balance
    const sales = await Sale.findAll({
      where: { 
        CashSessionId: sessionId,
        status: 'COMPLETED',
        deletedAt: null
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_sales']
      ],
      transaction: t,
      raw: true
    });
    
    const movements = await CashMovement.findAll({
      where: { CashRegisterId: session.CashRegisterId },
      attributes: [
        [sequelize.fn('SUM', sequelize.where(
          sequelize.col('amount'),
          sequelize.Op.gt,
          0
        )), 'total_in'],
        [sequelize.fn('SUM', sequelize.where(
          sequelize.col('amount'),
          sequelize.Op.lt,
          0
        )), 'total_out']
      ],
      transaction: t,
      raw: true
    });
    
    const expectedClosing = 
      session.opening_balance + 
      (sales[0].total_sales || 0) +
      (movements[0].total_in || 0) +
      (movements[0].total_out || 0);
    
    // Update session
    await session.update({
      expected_closing_balance: expectedClosing,
      counted_amount: countData.counted_amount,
      variance: countData.counted_amount - expectedClosing,
      reconciled_at: new Date(),
      reconciled_by: countData.reconciled_by,
      reconciliation_status: 
        Math.abs((countData.counted_amount - expectedClosing)) < 0.01 
          ? 'reconciled' 
          : 'discrepancy',
      status: 'closed',
      closed_at: new Date(),
      closing_balance: countData.counted_amount
    }, { transaction: t });
    
    // Lock the session
    await session.update({ is_locked: true }, { transaction: t });
    
    // Commit
    if (!transaction) {
      await t.commit();
    }
    
    // Audit log
    await AuditLog.create({
      user_id: countData.reconciled_by,
      ShopId: session.ShopId,
      action_type: 'CASH_SESSION_CLOSED',
      table_name: 'CashSessions',
      new_values: session.toJSON()
    });
    
    return session;
    
  } catch (error) {
    if (!transaction) {
      await t.rollback();
    }
    throw error;
  }
}
```

### Pattern 3: Record Expense with Audit
```javascript
async function recordExpense(expenseData, transaction = null) {
  const t = transaction || await sequelize.transaction();
  
  try {
    // Validate expense type
    const expenseType = await ExpenseType.findByPk(expenseData.ExpenseTypeId, {
      transaction: t
    });
    
    if (!expenseType) {
      throw new Error('Invalid expense type');
    }
    
    // Create expense
    const expense = await Expense.create({
      ShopId: expenseData.ShopId,
      ExpenseTypeId: expenseData.ExpenseTypeId,
      UserId: expenseData.UserId,
      amount: expenseData.amount,
      description: expenseData.description,
      date: expenseData.date || new Date()
    }, { transaction: t });
    
    // Update shop financials
    await ShopFinancial.increment('total_expenses', {
      by: expenseData.amount,
      where: { ShopId: expenseData.ShopId },
      transaction: t
    });
    
    // Recalculate net profit
    const financial = await ShopFinancial.findOne({
      where: { ShopId: expenseData.ShopId },
      transaction: t
    });
    
    await financial.update({
      net_profit: financial.total_sales - financial.total_expenses
    }, { transaction: t });
    
    // Audit
    await AuditLog.create({
      user_id: expenseData.UserId,
      ShopId: expenseData.ShopId,
      action_type: 'EXPENSE_CREATE',
      table_name: 'Expenses',
      new_values: expense.toJSON()
    }, { transaction: t });
    
    if (!transaction) {
      await t.commit();
    }
    
    return expense;
    
  } catch (error) {
    if (!transaction) {
      await t.rollback();
    }
    throw error;
  }
}
```

---

## 3. RECOMMENDED HOOKS

### Global Audit Hook (All Models)
```javascript
// hooks/auditHook.js
module.exports = function attachAuditHook(model) {
  // Log on create
  model.addHook('afterCreate', 'audit_create', async (instance, options) => {
    if (options.skipAudit) return;
    
    await AuditLog.create({
      user_id: options.userId,
      ShopId: instance.ShopId || options.ShopId,
      action_type: 'CREATE',
      table_name: model.tableName,
      new_values: instance.toJSON()
    });
  });
  
  // Log on update
  model.addHook('afterUpdate', 'audit_update', async (instance, options) => {
    if (options.skipAudit) return;
    
    const changes = {};
    for (const attr of Object.keys(instance.changed())) {
      changes[attr] = {
        old: instance._previousDataValues[attr],
        new: instance.dataValues[attr]
      };
    }
    
    await AuditLog.create({
      user_id: options.userId,
      ShopId: instance.ShopId || options.ShopId,
      action_type: 'UPDATE',
      table_name: model.tableName,
      old_values: { changes },
      new_values: instance.toJSON(),
      change_reason: options.changeReason
    });
  });
  
  // Log on destroy (soft delete)
  model.addHook('afterDestroy', 'audit_delete', async (instance, options) => {
    if (options.skipAudit) return;
    
    await AuditLog.create({
      user_id: options.userId,
      ShopId: instance.ShopId || options.ShopId,
      action_type: 'DELETE',
      table_name: model.tableName,
      old_values: instance.toJSON()
    });
  });
};

// Usage in model initialization
const attachAuditHook = require('./hooks/auditHook');

Sale.init({ ... }, { sequelize, ... });
attachAuditHook(Sale);
```

### Inventory Safety Hook
```javascript
// hooks/inventorySafety.js
Stock.addHook('beforeUpdate', 'validate_quantity', (stock) => {
  if (stock.quantity < 0) {
    throw new Error('Inventory cannot be negative');
  }
});

Stock.addHook('afterUpdate', 'sync_global_stock', async (stock) => {
  // Sync to GlobalStock (database trigger also does this)
  const globalStock = await GlobalStock.findOne({
    where: { ProductId: stock.ProductId }
  });
  
  if (globalStock) {
    const totalQty = await Stock.sum('quantity', {
      where: { ProductId: stock.ProductId }
    });
    
    await globalStock.update({ quantity: totalQty });
  }
});

Stock.addHook('afterUpdate', 'check_low_stock', async (stock) => {
  if (stock.quantity < stock.min_stock_level) {
    // Trigger notification
    await Notification.create({
      ShopId: stock.ShopId,
      title: `Low Stock Alert: ${stock.ProductId}`,
      message: `Product is below minimum level`,
      type: 'stock'
    });
  }
});
```

---

## 4. RECOMMENDED SCOPES (Query Helpers)

```javascript
// Sale.js scopes
Sale.addScope('default', {
  include: [
    {
      association: 'items',
      include: ['product']
    },
    { association: 'customer' },
    { association: 'cashier', attributes: ['id', 'username'] }
  ]
});

Sale.addScope('withInvoice', {
  include: [{ association: 'invoice' }]
});

Sale.addScope('byDate', (startDate, endDate) => ({
  where: {
    createdAt: {
      [Sequelize.Op.between]: [startDate, endDate]
    }
  }
}));

// Customers.js scopes
Customer.addScope('withCredits', {
  include: [{
    association: 'credits',
    attributes: ['id', 'total_credit', 'paid_credit', 'status']
  }]
});

Customer.addScope('byShop', (shopId) => ({
  where: { ShopId: shopId }
}));

// Stock.js scopes
Stock.addScope('withProduct', {
  include: [{
    association: 'product',
    attributes: ['id', 'name', 'barcode']
  }]
});

Stock.addScope('dangerousLevels', {
  where: Sequelize.where(
    Sequelize.col('quantity'),
    Sequelize.Op.lte,
    Sequelize.col('min_stock_level')
  )
});
```

---

## 5. VALIDATION RULES

```javascript
// User.js
User.addHook('beforeValidate', async (user) => {
  if (user.role !== 'owner' && !user.ShopId) {
    throw new Error('Managers and cashiers must be assigned to a shop');
  }
});

// Sale.js
Sale.addHook('beforeValidate', async (sale) => {
  if (sale.total_amount <= 0) {
    throw new Error('Sale amount must be greater than 0');
  }
  
  if (sale.tax_amount > sale.subtotal) {
    throw new Error('Tax cannot exceed subtotal');
  }
});

// Customer.js
Customer.addHook('beforeValidate', async (customer) => {
  if (!customer.ShopId) {
    throw new Error('Customer must belong to a shop');
  }
});

// CashSession.js
CashSession.addHook('beforeValidate', async (session) => {
  if (session.opening_balance < 0) {
    throw new Error('Opening balance cannot be negative');
  }
  
  if (session.status === 'closed' && !session.closing_balance) {
    throw new Error('Closing balance required when closing session');
  }
});
```

---

## 6. IMPLEMENTATION CHECKLIST

- [ ] Add all associations to models
- [ ] Implement paranoid soft delete on Sale, Invoice, Expense, Purchase
- [ ] Add all recommended hooks
- [ ] Create global audit hook and attach to all models
- [ ] Implement inventory safety hooks
- [ ] Add all scopes to commonly queried models
- [ ] Implement transaction patterns in all services
- [ ] Add validation rules
- [ ] Test concurrent operations (stock deduction, sales creation)
- [ ] Load test with 100+ concurrent sales
- [ ] Verify all audit logs created properly
- [ ] Test rollback scenarios
- [ ] Verify cash session reconciliation workflow
- [ ] Test soft delete and archive queries

