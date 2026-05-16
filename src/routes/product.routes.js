const express = require('express');
const ProductController = require('../controllers/product.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', ProductController.getAll);
router.get('/:id', ProductController.getById);
router.post('/', roleMiddleware(['owner', 'manager']), ProductController.create);
router.put('/:id', roleMiddleware(['owner', 'manager']), ProductController.update);
router.delete('/:id', roleMiddleware(['owner', 'manager']), ProductController.delete);

module.exports = router;
