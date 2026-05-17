const express = require('express');
const SupplierController = require('../controllers/supplier.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', SupplierController.getAll);
router.get('/:id', SupplierController.getById);
router.post('/', roleMiddleware(['manager']), SupplierController.create);
router.patch('/:id', roleMiddleware(['manager']), SupplierController.update);
router.delete('/:id', roleMiddleware(['owner']), SupplierController.delete);

module.exports = router;
