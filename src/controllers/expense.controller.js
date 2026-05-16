const BaseController = require('./base.controller');
const expenseService = require('../services/expense.service');

class ExpenseController extends BaseController {
  constructor() {
    super(expenseService);
  }
}

module.exports = new ExpenseController();
