const { sequelize } = require('./config/database');

// Import Models
const User = require('./models/User');
const Session = require('./models/Session');
const Shop = require('./models/Shop');
const UserShop = require('./models/UserShop');
const Category = require('./models/Category');
const Brand = require('./models/Brand');
const Product = require('./models/Product');
const ProductPricingRule = require('./models/ProductPricingRule');
const GlobalStock = require('./models/GlobalStock');
const Stock = require('./models/Stock');
const StockMovement = require('./models/StockMovement');
const StockTransfer = require('./models/StockTransfer');
const Sale = require('./models/Sale');
const SaleItem = require('./models/SaleItem');
const Invoice = require('./models/Invoice');
const Expense = require('./models/Expense');
const ShopFinancial = require('./models/ShopFinancial');
const Customer = require('./models/Customer');
const CashRegister = require('./models/CashRegister');
const CashSession = require('./models/CashSession');
const AuditLog = require('./models/AuditLog');
const Unit = require('./models/Unit');

// --- 🏪 SHOP RELATIONS (MULTI-TENANCY) ---
Shop.hasMany(User, { foreignKey: 'ShopId' });
User.belongsTo(Shop, { foreignKey: 'ShopId' });

Shop.hasMany(UserShop, { foreignKey: 'ShopId' });
UserShop.belongsTo(Shop, { foreignKey: 'ShopId' });
User.hasMany(UserShop, { foreignKey: 'UserId' });
UserShop.belongsTo(User, { foreignKey: 'UserId' });

Shop.hasMany(Stock, { foreignKey: 'ShopId' });
Stock.belongsTo(Shop, { foreignKey: 'ShopId' });

Shop.hasMany(Sale, { foreignKey: 'ShopId' });
Sale.belongsTo(Shop, { foreignKey: 'ShopId' });

Shop.hasMany(Invoice, { foreignKey: 'ShopId' });
Invoice.belongsTo(Shop, { foreignKey: 'ShopId' });

Shop.hasMany(Expense, { foreignKey: 'ShopId' });
Expense.belongsTo(Shop, { foreignKey: 'ShopId' });

Shop.hasOne(ShopFinancial, { foreignKey: 'ShopId' });
ShopFinancial.belongsTo(Shop, { foreignKey: 'ShopId' });

Shop.hasMany(Customer, { foreignKey: 'ShopId' });
Customer.belongsTo(Shop, { foreignKey: 'ShopId' });

Shop.hasMany(CashRegister, { foreignKey: 'ShopId' });
CashRegister.belongsTo(Shop, { foreignKey: 'ShopId' });

// Cash sessions
Shop.hasMany(CashSession, { foreignKey: 'ShopId' });
CashSession.belongsTo(Shop, { foreignKey: 'ShopId' });
CashRegister.hasMany(CashSession, { foreignKey: 'CashRegisterId' });
CashSession.belongsTo(CashRegister, { foreignKey: 'CashRegisterId' });

Shop.hasMany(AuditLog, { foreignKey: 'ShopId' });
AuditLog.belongsTo(Shop, { foreignKey: 'ShopId' });

// --- 🔐 AUTH & SESSIONS ---
User.hasMany(Session, { foreignKey: 'UserId' });
Session.belongsTo(User, { foreignKey: 'UserId' });

// --- 📦 PRODUCT & STOCK ---
Category.hasMany(Product, { foreignKey: 'CategoryId' });
Product.belongsTo(Category, { foreignKey: 'CategoryId' });

Brand.hasMany(Product, { foreignKey: 'BrandId' });
Product.belongsTo(Brand, { foreignKey: 'BrandId' });

Unit.hasMany(Product, { foreignKey: 'unit_of_measure' });
Product.belongsTo(Unit, { foreignKey: 'unit_of_measure' });

Product.hasOne(GlobalStock, { foreignKey: 'ProductId' });
GlobalStock.belongsTo(Product, { foreignKey: 'ProductId' });

Product.hasMany(Stock, { foreignKey: 'ProductId' });
Stock.belongsTo(Product, { foreignKey: 'ProductId' });

Product.hasMany(ProductPricingRule, { foreignKey: 'ProductId' });
ProductPricingRule.belongsTo(Product, { foreignKey: 'ProductId' });

// --- 🧾 SALES & INVOICES ---
User.hasMany(Sale, { foreignKey: 'UserId' });
Sale.belongsTo(User, { foreignKey: 'UserId' });

Customer.hasMany(Sale, { foreignKey: 'CustomerId' });
Sale.belongsTo(Customer, { foreignKey: 'CustomerId' });

Sale.hasMany(SaleItem, { foreignKey: 'SaleId' });
SaleItem.belongsTo(Sale, { foreignKey: 'SaleId' });

Product.hasMany(SaleItem, { foreignKey: 'ProductId' });
SaleItem.belongsTo(Product, { foreignKey: 'ProductId' });

Sale.hasOne(Invoice, { foreignKey: 'SaleId' });
Invoice.belongsTo(Sale, { foreignKey: 'SaleId' });

// Link sales to cash sessions
CashSession.hasMany(Sale, { foreignKey: 'CashSessionId' });
Sale.belongsTo(CashSession, { foreignKey: 'CashSessionId' });

User.hasMany(Invoice, { foreignKey: 'UserId' });
Invoice.belongsTo(User, { foreignKey: 'UserId' });

// --- 📌 AUDIT LOGS ---
User.hasMany(AuditLog, { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Session,
  Shop,
  UserShop,
  Category,
  Brand,
  Product,
  ProductPricingRule,
  GlobalStock,
  Stock,
  StockMovement,
  StockTransfer,
  Sale,
  SaleItem,
  Invoice,
  Expense,
  ShopFinancial,
  Customer,
  CashRegister,
  CashSession,
  AuditLog,
  Unit
};
