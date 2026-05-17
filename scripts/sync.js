const { sequelize } = require('../config/database');
// Import all models to ensure they are registered with Sequelize
require('../models/User');
require('../models/Device');
require('../models/Setting');
require('../models/AuditLog');
require('../models/Category');
require('../models/Supplier');
require('../models/Product');
require('../models/Stock');
require('../models/StockMovement');
require('../models/Purchase');
require('../models/PurchaseItem');
require('../models/Sale');
require('../models/SaleItem');
require('../models/CashRegister');
require('../models/CashMovement');
require('../models/Expense');
require('../models/Notification');
require('../models/SyncQueue');

// Keep old models that might be useful but are not in the current SQL
require('../models/Brand');
require('../models/Unit');
require('../models/ProductImage');
require('../models/Customer');
require('../models/ExpenseCategory');
require('../models/CustomerCredit');
require('../models/CreditPayment');
require('../models/DailyCashReport');
require('../models/DailyReport');

const syncDB = async () => {
  try {
    console.log('Syncing database...');
    // Use force: true if we want to reset for the new schema, but alter: true is safer.
    // Given the major ID type changes (INT to UUID), alter might fail on some DBs.
    // I'll try alter: true first.
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to sync database:', error);
    process.exit(1);
  }
};

syncDB();
