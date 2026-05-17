const express = require('express');
const ExpenseController = require('../controllers/expense.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', ExpenseController.getAll);
router.get('/:id', ExpenseController.getById);
router.post('/', roleMiddleware(['manager']), ExpenseController.create);
router.patch('/:id', roleMiddleware(['manager']), ExpenseController.update);
router.delete('/:id', roleMiddleware(['owner']), ExpenseController.delete);

module.exports = router;
