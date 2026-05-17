const express = require('express');
const authRoutes = require('./auth.routes');
const categoryRoutes = require('./category.routes');
const brandRoutes = require('./brand.routes');
const unitRoutes = require('./unit.routes');
const productRoutes = require('./product.routes');
const supplierRoutes = require('./supplier.routes');
const customerRoutes = require('./customer.routes');
const saleRoutes = require('./sale.routes');
const purchaseRoutes = require('./purchase.routes');
const stockRoutes = require('./stock.routes');
const expenseRoutes = require('./expense.routes');
const creditRoutes = require('./credit.routes');
const notificationRoutes = require('./notification.routes');
const syncRoutes = require('./sync.routes');
const reportRoutes = require('./report.routes');
const cashRoutes = require('./cash.routes');
const userRoutes = require('./user.routes');
const shopRoutes = require('./shop.routes');

// Middlewares
const authMiddleware = require('../middlewares/auth.middleware');
const shopGuard = require('../middlewares/shopGuard');

const router = express.Router();

// Public Routes
router.use('/auth', authRoutes);

// Protected Routes (Auth Required)
router.use(authMiddleware);

// File Uploads
router.use('/uploads', require('./upload.routes.js'));

// Dashboards & Financials
router.use('/financials', require('./dashboard.routes.js'));

// Shop-Scoped Routes (Isolation Required)
router.use(shopGuard);

router.use('/users', userRoutes);
router.use('/shops', shopRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/units', unitRoutes);
router.use('/products', productRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/customers', customerRoutes);
router.use('/sales', saleRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/stock', stockRoutes);
router.use('/expenses', expenseRoutes);
router.use('/credits', creditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/sync', syncRoutes);
router.use('/cash-register', cashRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
