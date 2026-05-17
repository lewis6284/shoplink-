const express = require('express');
const BrandController = require('../controllers/brand.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', BrandController.getAll);
router.get('/:id', BrandController.getById);
router.post('/', roleMiddleware(['owner', 'manager']), BrandController.create);
router.patch('/:id', roleMiddleware(['owner', 'manager']), BrandController.update);
router.delete('/:id', roleMiddleware(['owner', 'manager']), BrandController.delete);

module.exports = router;
