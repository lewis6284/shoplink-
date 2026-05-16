const BaseService = require('./base.service');
const Expense = require('../models/Expense');
const FinancialService = require('./financialService');
const AuditService = require('./audit.service');
const { sequelize } = require('../config/database');

class ExpenseService extends BaseService {
  constructor() {
    super(Expense);
  }

  async create(data, userId = null, req = null) {
    const transaction = await sequelize.transaction();
    const shopId = data.ShopId || req?.shopId;

    try {
      // 1. Create Expense
      const expense = await this.model.create({
        ...data,
        ShopId: shopId,
        UserId: userId
      }, { transaction });

      // 2. Update Shop Financials
      await FinancialService.recordExpense(shopId, data.amount);

      // 3. Audit Log
      if (userId) {
        await AuditService.log({
          userId,
          shopId,
          actionType: 'EXPENSE_CREATE',
          tableName: 'Expenses',
          newValues: expense.toJSON()
        });
      }

      await transaction.commit();
      return expense;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new ExpenseService();
