const express = require('express');
const StockController = require('../controllers/stock.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const shopMiddleware = require('../middlewares/shop.middleware');

const StockReportController = require('../controllers/stock.report.controller');
const StockTransferController = require('../controllers/stock.transfer.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(shopMiddleware);

// Stock Management
router.get('/', StockController.getAll);
router.post('/add', roleMiddleware(['owner', 'manager']), StockController.add);
router.patch('/adjust', roleMiddleware(['owner', 'manager']), StockController.adjust);

// Reports
router.get('/reports/daily', roleMiddleware(['owner', 'manager']), StockReportController.getDailySummary);
router.get('/reports/losses', roleMiddleware(['owner', 'manager']), StockReportController.getTopLosses);

// Transfers
router.get('/transfers', roleMiddleware(['owner', 'manager']), StockTransferController.getAll);
router.post('/transfers', roleMiddleware(['owner']), StockTransferController.create);
router.patch('/transfers/:id/approve', roleMiddleware(['owner']), StockTransferController.approve);
router.patch('/transfers/:id/dispatch', roleMiddleware(['owner']), StockTransferController.dispatch);
router.patch('/transfers/:id/receive', roleMiddleware(['manager']), StockTransferController.receive);
router.patch('/transfers/:id/cancel', roleMiddleware(['owner']), StockTransferController.cancel);

// Movements History
router.get('/movements', StockController.getMovements);

module.exports = router;
