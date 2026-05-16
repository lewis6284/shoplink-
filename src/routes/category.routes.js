const express = require('express');
const CategoryController = require('../controllers/category.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);
router.post('/', roleMiddleware(['owner', 'manager']), CategoryController.create);
router.put('/:id', roleMiddleware(['owner', 'manager']), CategoryController.update);
router.delete('/:id', roleMiddleware(['owner', 'manager']), CategoryController.delete);

module.exports = router;
