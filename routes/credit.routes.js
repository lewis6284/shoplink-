const express = require('express');
const CreditController = require('../controllers/credit.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', CreditController.getAll);
router.post('/', CreditController.createCredit);
router.get('/:id', CreditController.getById);
router.post('/:id/pay', roleMiddleware(['manager', 'cashier']), CreditController.pay);

module.exports = router;
