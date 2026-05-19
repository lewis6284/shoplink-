const express = require('express');
const PurchaseController = require('../controllers/purchase.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const shopMiddleware = require('../middlewares/shop.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(shopMiddleware);

router.get('/', PurchaseController.getAll);
router.get('/:id', PurchaseController.getById);
router.post('/', roleMiddleware(['owner', 'manager']), PurchaseController.create);

module.exports = router;
