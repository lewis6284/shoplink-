const db = require('../db');
const { Op } = require('sequelize');

async function verifyIntegrity() {
  console.log('\n--- DATA INTEGRITY ARBITER ---');
  
  try {
    // 1. Check Sales vs Items
    const salesCount = await db.Sale.count();
    const itemsCount = await db.SaleItem.count();
    console.log(`Sales: ${salesCount}, SaleItems: ${itemsCount}`);

    // 2. Check Idempotency (SyncQueue)
    const syncCount = await db.SyncQueue.count({ where: { sync_status: 'synced' } });
    console.log(`Synced entries in Queue: ${syncCount}`);

    if (salesCount !== syncCount) {
      console.error('❌ DISCREPANCY: Sales count does not match SyncQueue count!');
    } else {
      console.log('✅ IDEMPOTENCY: Sales count matches SyncQueue.');
    }

    // 3. Stock Consistency
    // Find our test product (using the first one as in stress test)
    const product = await db.Product.findOne();
    const stock = await db.Stock.findOne({ where: { ProductId: product.id } });
    const movementsOut = await db.StockMovement.sum('quantityChange', { 
      where: { StockId: stock.id, type: 'OUT' } 
    });
    
    console.log(`Product: ${product.name}`);
    console.log(`Current Stock: ${stock.quantity}`);
    console.log(`Total "OUT" Movements: ${movementsOut}`);

    if (parseFloat(stock.quantity) < 0) {
      console.error('❌ CRITICAL: Stock went negative!');
    } else {
      console.log('✅ STOCK: Remained non-negative.');
    }

    // 4. Cash Integrity
    const register = await db.CashRegister.findOne();
    const cashMovementsIn = await db.CashMovement.sum('amount', {
      where: { CashRegisterId: register.id, type: 'IN' }
    });
    
    console.log(`Register Balance: ${register.balance}`);
    console.log(`Sum of "IN" Movements: ${cashMovementsIn}`);

    if (Math.abs(parseFloat(register.balance) - parseFloat(cashMovementsIn)) > 0.01) {
      console.error('❌ DISCREPANCY: Cash balance does not match movements!');
    } else {
      console.log('✅ CASH: Balance is consistent with movements.');
    }

  } catch (err) {
    console.error('VERIFICATION FAILED:', err);
  } finally {
    process.exit(0);
  }
}

verifyIntegrity();
