const express = require('express');
const ReportController = require('../controllers/report.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);
// Most report endpoints are for owner/manager
router.get('/daily', roleMiddleware(['owner', 'manager']), ReportController.daily);
router.post('/trigger/daily', roleMiddleware(['owner', 'manager']), ReportController.triggerDaily);
router.get('/monthly', roleMiddleware(['owner', 'manager']), ReportController.monthly);
router.get('/top-products', roleMiddleware(['owner', 'manager']), ReportController.topProducts);
router.get('/profit', roleMiddleware(['owner', 'manager']), ReportController.profit);
router.get('/stock-alerts', roleMiddleware(['owner', 'manager']), ReportController.stockAlerts);
router.get('/employee-sales', roleMiddleware(['owner', 'manager']), ReportController.employeeSales);

// Owner-only global report
router.get('/owner/global', roleMiddleware(['owner']), ReportController.ownerGlobal);

// Cashier performance: owner/manager/cashier (cashier will be limited to own data)
router.get('/cashier/performance', roleMiddleware(['owner', 'manager', 'cashier']), ReportController.cashierPerformance);

router.get('/audit-logs', roleMiddleware(['owner']), ReportController.auditLogs);

module.exports = router;
