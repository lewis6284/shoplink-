const CreditService = require('../services/credit.service');
const ApiResponse = require('../utils/response');
const CustomerCredit = require('../models/CustomerCredit');
const CreditPayment = require('../models/CreditPayment');
const Customer = require('../models/Customer');

class CreditController {
  static async getAll(req, res, next) {
    try {
      const credits = await CustomerCredit.findAll({
        include: [{ model: Customer, as: 'customer' }],
        order: [['createdAt', 'DESC']]
      });
      return ApiResponse.success(res, credits);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const credit = await CustomerCredit.findByPk(req.params.id, {
        include: [
          { model: Customer, as: 'customer' },
          { model: CreditPayment, as: 'payments' }
        ]
      });
      if (!credit) return ApiResponse.error(res, 'Credit record not found', 404);
      return ApiResponse.success(res, credit);
    } catch (error) {
      next(error);
    }
  }

  static async pay(req, res, next) {
    try {
      const { amount, method } = req.body;
      const credit = await CreditService.payCredit(req.params.id, amount, method);
      return ApiResponse.success(res, credit, 'Payment recorded successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CreditController;
