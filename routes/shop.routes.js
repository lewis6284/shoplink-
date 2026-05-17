const express = require('express');
const ShopController = require('../controllers/shop.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// Read-only: any authenticated user can fetch shop info (needed to bootstrap UI context)
router.get('/', ShopController.getAll);
router.get('/:id', ShopController.getById);

// Write: Owner only
router.post('/', roleMiddleware(['owner']), ShopController.create);
router.patch('/:id', roleMiddleware(['owner']), ShopController.update);
router.delete('/:id', roleMiddleware(['owner']), ShopController.delete);

module.exports = router;
