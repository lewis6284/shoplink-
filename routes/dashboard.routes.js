const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const shopGuard = require('../middlewares/shopGuard');

const router = express.Router();

router.use(authMiddleware);

// Global stats (Owners only)
router.get('/global', roleMiddleware(['owner']), dashboardController.getGlobalStats);

// Shop stats (Managers and Owners)
router.get('/shop/:shopId', roleMiddleware(['owner', 'manager']), dashboardController.getShopStats);

// Daily stats for current cashier (Cashiers, Managers, Owners)
router.get('/daily', shopGuard, dashboardController.getDailyStats);

module.exports = router;
