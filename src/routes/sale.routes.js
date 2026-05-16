const express = require('express');
const SaleController = require('../controllers/sale.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const shopMiddleware = require('../middlewares/shop.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(shopMiddleware);

router.get('/', SaleController.getAll);
router.get('/:id', SaleController.getById);
router.post('/', roleMiddleware(['cashier']), SaleController.create);
router.post('/:id/cancel', roleMiddleware(['cashier']), SaleController.cancel);

module.exports = router;
