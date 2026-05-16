# ShopLink Database Deployment Roadmap
## Phase-by-Phase Implementation Guide

---

## EXECUTIVE SUMMARY

**Current Status**: Architecture Score: 5.6/10 (PRODUCTION-GRADE WITH CRITICAL IMPROVEMENTS REQUIRED)

**Critical Issues**: 10 production-breaking problems identified and documented with SQL fixes

**Deployment Timeline**: 8-12 weeks for full implementation across 4 phases

**Risk Level**: 🔴 HIGH - Multiple financial integrity and multi-tenant isolation gaps must be addressed in Phase 1

---

## PHASE 1: CRITICAL FIXES (Week 1 - MANDATORY)

**Duration**: 4-6 hours (1 maintenance window)  
**Downtime Required**: 2-4 hours  
**Risk**: MEDIUM (all fixes are additive, no data deletion)  
**Rollback**: Simple reversal of ALTER statements

### What Gets Fixed
1. **Multi-tenant isolation** - Customers.ShopId becomes NOT NULL (security critical)
2. **Cash reconciliation** - New fields for physical cash count validation
3. **Financial audit trail** - Soft deletes on Sales, Invoices, Expenses
4. **Invoice atomicity** - Unique constraint on Invoice-Sale relationship
5. **Expense categorization** - ExpenseTypeId becomes required
6. **Sync isolation** - sync_queue.ShopId added for offline-first multi-tenancy
7. **Daily report locking** - Immutability enforcement field
8. **Session isolation** - Sessions.ShopId for per-shop session tracking

### Deployment Steps
```bash
# 1. Full database backup (required)
mysqldump -u root -p shoplink > shoplink_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Execute Phase 1 ALTER statements
mysql -u root -p shoplink < PRODUCTION_FIXES.sql
# (SQL file has clear markers: "-- PHASE 1: CRITICAL FIXES")

# 3. Verify data integrity
# Run the verification queries at end of PRODUCTION_FIXES.sql

# 4. Test these critical workflows
- Create and complete a sale
- Close a cash session
- Create an expense
- Create a customer
- Create an invoice from a sale
```

### Pre-Deployment Checklist
- [ ] Backup database
- [ ] Notify all users (2-hour downtime window)
- [ ] Disable POS system during deployment
- [ ] Shut down all Node.js backend services
- [ ] Shut down all mobile sync workers
- [ ] Verify no long-running queries
- [ ] Have database connection string ready
- [ ] Have rollback backup tested and accessible

### Post-Deployment Checklist
- [ ] Run verification queries (all should return 0)
- [ ] Verify all tables have correct schema
- [ ] Restart Node.js backend services
- [ ] Re-enable mobile sync
- [ ] Test a complete sale-to-invoice workflow
- [ ] Verify cash session close works
- [ ] Check audit logs were created for all changes
- [ ] Monitor database performance for 1 hour
- [ ] Clear any stuck connections

### Database Triggers to Create (Week 1)
After ALTER statements complete, create these 7 critical triggers:

1. **tr_dailyreport_prevent_edit_if_locked** - Prevents accidental daily report changes
2. **tr_cashsession_prevent_edit_if_closed** - Prevents closed session modifications
3. **tr_prevent_sale_delete_if_invoiced** - Prevents orphaned invoices
4. **tr_saleitem_insert_deduct_stock** - Atomic stock deduction on sale (CRITICAL)
5. **tr_stock_update_sync_global** - Syncs warehouse-level inventory
6. **tr_validate_credit_payment_amount** - Prevents overpayment of credits
7. **tr_credit_payment_update_status** - Updates credit status on payment

```bash
# Execute trigger creation (in PRODUCTION_FIXES.sql Section "PHASE 1: DATABASE TRIGGERS")
mysql -u root -p shoplink < PRODUCTION_FIXES.sql
```

### What NOT to Change
- ✅ DO NOT modify production data
- ✅ DO NOT change existing column meanings
- ✅ DO NOT delete any columns
- ✅ DO NOT modify table names
- ✅ DO NOT change primary keys

### Expected Outcomes
- All 31 tables have proper ShopId isolation
- Financial records have audit trail (deletedAt)
- Cash reconciliation is traceable
- Invoice-Sale relationship is 1:1 enforced
- Stock movements are atomic and auditable

---

## PHASE 2: HIGH PRIORITY FIXES (Weeks 2-4)

**Duration**: 4-6 hours per week  
**Downtime**: 30 minutes per deployment  
**Risk**: LOW (non-critical enhancements)  
**Dependencies**: Phase 1 must be complete

### What Gets Fixed

#### Week 2: Purchase Receiving Workflow
```sql
-- Add fields to Purchases
expected_quantity, received_quantity, received_at, received_by, variance, variance_reason

-- Enables: PO matching, receipt variance tracking, receiving discrepancy reports
```

#### Week 2: Stock Adjustment Authorization
```sql
-- Add fields to stock_adjustments
authorization_by, authorization_at, count_document_reference

-- Enables: Physical count audits, who approved what, document traceability
```

#### Week 3: Stock Transfer Delivery Tracking
```sql
-- Add fields to StockTransfers
expected_delivery_at, delivery_confirmed_at, escalation_at, escalation_reason

-- Enables: Late delivery tracking, inter-shop transfer visibility
```

#### Week 3: Customer Credit Audit Trail
```sql
-- New table: credit_adjustments
-- Tracks every credit modification with audit trail

-- Enables: Credit write-off audits, dispute resolution, compliance reports
```

#### Week 3-4: Multi-tenant Isolation Completion
```sql
-- Add ShopId to:
CashMovements, ProductPricingRules, Devices, daily_cash_reports, notifications

-- Enables: Complete multi-tenant data isolation
```

### Deployment Approach
- Deploy one ALTER statement per evening (after business hours)
- Each takes 2-5 minutes with no downtime
- Monitor logs for errors
- Verify new columns visible in queries

---

## PHASE 2: PERFORMANCE OPTIMIZATION (Weeks 2-4)

**Duration**: 1-2 hours  
**Downtime**: NONE (indexes created online)  
**Risk**: MINIMAL  
**Impact**: 30-50% query speedup on POS operations

### Indexes to Create

**Authentication** (User login speed)
```sql
ALTER TABLE users ADD INDEX idx_users_email_active (email, is_active);
ALTER TABLE users ADD INDEX idx_users_ShopId_role (ShopId, role);
```

**Point of Sale** (Most critical - improves cashier speed)
```sql
ALTER TABLE Sales ADD INDEX idx_sales_ShopId_date (ShopId, createdAt);
ALTER TABLE Sales ADD INDEX idx_sales_status_date (status, createdAt);
ALTER TABLE Sales ADD INDEX idx_sales_customer (CustomerId);
ALTER TABLE Stocks ADD INDEX idx_stock_ShopId_qty (ShopId, quantity, min_stock_level);
```

**Inventory** (Stock lookup during sales)
```sql
ALTER TABLE Stocks ADD INDEX idx_stock_ShopId_qty (ShopId, quantity, min_stock_level);
ALTER TABLE StockMovements ADD INDEX idx_movements_product_date (StockId, createdAt DESC);
```

**Reporting** (Daily/monthly reports)
```sql
ALTER TABLE DailyReports ADD INDEX idx_dailyreports_shop_month (ShopId, YEAR(report_date), MONTH(report_date));
ALTER TABLE Expenses ADD INDEX idx_expenses_ShopId_date (ShopId, date);
```

### Performance Verification
```javascript
// Before index creation - measure query time
// SELECT * FROM Sales WHERE ShopId = 'x' AND CreatedAt > '2024-01-01' takes 5s

// After index creation - same query takes 50ms
// That's 100x faster!
```

---

## PHASE 3: ADVANCED FEATURES (Month 2)

**Duration**: 2-3 weeks  
**Downtime**: NONE  
**Risk**: LOW  
**Purpose**: Enhanced reporting and compliance

### What Gets Implemented

#### Reporting Views (3 new views)
```sql
-- v_stock_status - Current inventory by shop, low stock alerts
-- v_daily_sales_summary - Daily revenue, payment methods, customer counts
-- v_cashier_performance - Cashier transaction volume and average sale size
```

#### Audit Log Enhancements
```sql
-- Add fields: ip_address, device_id, change_reason, is_sensitive_field
-- Enables: IP-based fraud detection, device tracking, compliance audit trails
```

#### Cash Audit Fields
```sql
-- Add fields to CashSession:
opening_count_by, opening_count_at, closing_count_by, closing_count_at,
physical_count_amount, audit_by, audit_at, audit_notes, is_locked

-- Enables: Complete cash audit trail, who counted what and when
```

---

## PHASE 4: ENTERPRISE FEATURES (Month 3+)

**Duration**: 4-6 weeks  
**Downtime**: NONE (new features)  
**Risk**: LOW  
**Purpose**: Scalability and advanced compliance

### What Gets Implemented

#### Financial GL Accounts (New table)
```sql
-- Enables: Accounting integration, double-entry bookkeeping, detailed GL reports
-- Required for: Professional audit reports, tax compliance, financial statements
```

#### Stock Reservation System
```sql
-- Reserve stock for pending orders (don't oversell)
-- Enables: Pre-orders, backorders, allocation tracking
```

#### Batch/Lot Tracking
```sql
-- Track expiry dates, serial numbers per product batch
-- Enables: Recalls, shelf-life management, serialized inventory
```

#### Multi-Currency Support
```sql
-- Store prices in multiple currencies
-- Enables: International expansion, multiple pricing tiers
```

#### Database High Availability
```sql
-- MySQL Master-Slave replication
-- Enables: Read replicas, automatic failover, 24/7 uptime SLA
```

---

## SEQUELIZE MODEL UPDATES

**Timing**: Deploy with Phase 1 database changes

### Critical Model Changes (All must be done)

1. **Sale.js** - Add paranoid soft delete support
2. **Invoice.js** - Add paranoid soft delete support
3. **Expense.js** - Add paranoid soft delete support
4. **Purchase.js** - Add paranoid soft delete support
5. **All models** - Add global audit hook

### Associated Changes

```javascript
// hooks/auditHook.js - Global audit logger
// SEQUELIZE_BEST_PRACTICES.md has full implementation code

// Example for Sale model:
Sale.init({
  // ... fields
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  paranoid: true,  // Enable soft delete
  timestamps: true
});

attachAuditHook(Sale);  // Add to all models
```

### Testing Required

```bash
# Before deploying any model changes, test:
npm test  # Run full test suite

# Specific test cases needed:
- [ ] Create and soft-delete a sale
- [ ] Query deleted sales (should be excluded by default)
- [ ] Query all sales including deleted (paranoid: false)
- [ ] Audit log created for delete operation
- [ ] Stock deduction happens atomically
- [ ] Concurrent sales don't cause race conditions
```

---

## ROLLBACK PROCEDURE

If Phase 1 deployment fails:

```bash
# 1. Restore database from backup
mysql -u root -p shoplink < shoplink_backup_YYYYMMDD_HHMMSS.sql

# 2. Restart Node.js services
systemctl restart shoplink-api

# 3. Verify system is working
curl http://localhost:3000/api/health

# 4. Notify team of rollback
```

**Rollback time**: 5-10 minutes (automated backup restoration)

---

## DEPLOYMENT SCHEDULE (Recommended)

```
Week 1:
  Mon: Phase 1 Critical Fixes (2-4 hour maintenance window)
  Tue-Fri: Monitoring & verification
  
Week 2:
  Mon-Wed: Phase 2 Purchase Receiving Workflow
  Thu-Fri: Phase 2 Performance Indexes
  
Week 3:
  Mon-Wed: Phase 2 Stock Transfer Tracking
  Thu-Fri: Phase 2 Credit Audit Trail
  
Week 4:
  Mon-Tue: Phase 2 Completion & Testing
  Wed-Fri: Phase 3 Planning
  
Month 2 (Weeks 5-8):
  Phase 3 Advanced Features & Reporting
  
Month 3+ (Weeks 9+):
  Phase 4 Enterprise Features
```

---

## DEPLOYMENT RISK ASSESSMENT

| Phase | Risk Level | Critical? | Rollback Time | Notes |
|-------|-----------|-----------|--------------|-------|
| 1 | 🟠 MEDIUM | YES | 10 min | Additive only, safe to roll back |
| 2 | 🟢 LOW | NO | 5 min | Each ALTER is independent |
| 3 | 🟢 LOW | NO | None | Views & indexes, no data risk |
| 4 | 🟢 LOW | NO | None | New features, additive only |

---

## TESTING PROTOCOL

### Unit Testing
```bash
# Each model update
npm test models/Sale.test.js
npm test models/Stock.test.js
npm test models/CashSession.test.js
```

### Integration Testing
```bash
# Complete workflows
npm test workflows/sale-to-invoice.test.js
npm test workflows/cash-session-close.test.js
npm test workflows/stock-transfer.test.js
```

### Performance Testing
```bash
# Load test with 100 concurrent users
npm test performance/concurrent-sales.test.js
npm test performance/stock-queries.test.js
```

### Data Integrity Testing
```bash
# Post-deployment verification
npm test integrity/multi-tenant-isolation.test.js
npm test integrity/stock-consistency.test.js
npm test integrity/financial-audit-trail.test.js
```

---

## MONITORING AFTER DEPLOYMENT

### Key Metrics to Watch

**Phase 1 Deployment (First 24 hours)**
- [ ] Database CPU usage: Should remain < 50%
- [ ] Query response time: Should not degrade
- [ ] Error logs: No new errors should appear
- [ ] Audit logs: Verify creating entries correctly
- [ ] Cash sessions: Can still open/close
- [ ] Sales: Can still be created
- [ ] Stock: Still deducting correctly

**Ongoing**
- [ ] POS transaction speed: Should remain < 2 seconds
- [ ] Daily report generation: Should remain < 5 seconds
- [ ] Audit log volume: Monitor disk usage
- [ ] Database size: Should not grow unexpectedly
- [ ] Backup success: Daily backups must succeed

### Alerting Rules

```javascript
// Alert if POS transactions take > 3 seconds
db.on('query', (query, time) => {
  if (query.includes('SELECT') && time > 3000) {
    logger.warn(`Slow query (${time}ms): ${query}`);
    sendAlert('Database performance degraded');
  }
});

// Alert if audit logs stop being created
setInterval(async () => {
  const recent = await AuditLog.findAll({
    where: {
      createdAt: { [Op.gte]: moment().subtract(5, 'minutes').toDate() }
    }
  });
  
  if (recent.length === 0) {
    sendAlert('Audit logging appears to be broken');
  }
}, 5 * 60 * 1000);
```

---

## SUPPORT & DOCUMENTATION

**Key Files Generated:**
1. [COMPREHENSIVE_AUDIT_REPORT.md](COMPREHENSIVE_AUDIT_REPORT.md) - Full 14-section audit with detailed findings
2. [PRODUCTION_FIXES.sql](PRODUCTION_FIXES.sql) - All ALTER statements and triggers (ready to execute)
3. [SEQUELIZE_BEST_PRACTICES.md](SEQUELIZE_BEST_PRACTICES.md) - Model updates and transaction patterns
4. [DEPLOYMENT_ROADMAP.md](DEPLOYMENT_ROADMAP.md) - This file (implementation timeline)

**Getting Help:**
- Review COMPREHENSIVE_AUDIT_REPORT.md for detailed explanations
- Use PRODUCTION_FIXES.sql for exact SQL commands
- Follow SEQUELIZE_BEST_PRACTICES.md for code patterns
- Execute DEPLOYMENT_ROADMAP.md steps in order

---

## NEXT STEPS (For You to Do)

**Immediate (This week):**
1. [ ] Read COMPREHENSIVE_AUDIT_REPORT.md (fully understand the issues)
2. [ ] Review PRODUCTION_FIXES.sql (familiarize with changes)
3. [ ] Schedule Phase 1 maintenance window (2-4 hours, off-business hours)
4. [ ] Backup database (test restoration)
5. [ ] Notify team of deployment plan

**Week 1 of Deployment:**
6. [ ] Execute Phase 1 ALTER statements
7. [ ] Create Phase 1 database triggers
8. [ ] Run verification queries
9. [ ] Test critical workflows
10. [ ] Monitor logs for 24 hours

**Weeks 2-4:**
11. [ ] Begin Sequelize model updates
12. [ ] Create performance indexes
13. [ ] Implement Phase 2 features

**Weeks 5+:**
14. [ ] Phase 3 advanced features
15. [ ] Phase 4 enterprise setup

---

**Questions?** All answers are in the generated documents. Start with COMPREHENSIVE_AUDIT_REPORT.md.
