const express = require('express');
const CustomerController = require('../controllers/customer.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', CustomerController.getAll);
router.get('/:id', CustomerController.getById);
router.post('/', roleMiddleware(['owner', 'manager', 'cashier']), CustomerController.create);
router.patch('/:id', roleMiddleware(['owner', 'manager']), CustomerController.update);
router.delete('/:id', roleMiddleware(['owner']), CustomerController.delete);

module.exports = router;
