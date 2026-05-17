const express = require('express');
const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['owner', 'manager'])); // Owner manages managers, Manager manages cashiers

router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', roleMiddleware(['owner']), UserController.create);
router.put('/:id', roleMiddleware(['owner', 'manager']), UserController.update);
router.delete('/:id', roleMiddleware(['owner']), UserController.delete);

module.exports = router;
