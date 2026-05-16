const express = require('express');
const CashController = require('../controllers/cash.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// Opening and closing cash sessions — allowed for owner/manager/cashier (shopGuard will scope)
router.post('/open', roleMiddleware(['owner', 'manager', 'cashier']), CashController.open);
router.post('/close', roleMiddleware(['owner', 'manager', 'cashier']), CashController.close);

module.exports = router;
