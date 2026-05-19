const express = require('express');
const SaleController = require('../controllers/sale.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const shopMiddleware = require('../middlewares/shop.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(shopMiddleware);

router.get('/pending-approval', roleMiddleware(['owner', 'manager']), SaleController.getPendingApproval);
router.get('/', SaleController.getAll);
router.get('/:id', SaleController.getById);
router.post('/', roleMiddleware(['cashier', 'manager', 'owner']), SaleController.create);
router.post('/:id/approve', roleMiddleware(['owner']), SaleController.approve);
router.post('/:id/reject', roleMiddleware(['owner']), SaleController.reject);
router.post('/:id/cancel', roleMiddleware(['manager', 'owner']), SaleController.cancel);

module.exports = router;
