const express = require('express');
const UnitController = require('../controllers/unit.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', UnitController.getAll);
router.get('/:id', UnitController.getById);
router.post('/', roleMiddleware(['manager']), UnitController.create);
router.patch('/:id', roleMiddleware(['manager']), UnitController.update);
router.delete('/:id', roleMiddleware(['owner']), UnitController.delete);

module.exports = router;
