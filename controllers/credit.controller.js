
// --- SERVICE LOGIC INLINED ---
const CustomerCredit = require('../models/CustomerCredit');
const CreditPayment = require('../models/CreditPayment');
const Customer = require('../models/Customer');
const { sequelize } = require('../config/database');

const CreditService = {
  async addCredit(customerId, saleId, amount, dueDate, transaction = null) {
    const credit = await CustomerCredit.create({
      customer_id: customerId,
      sale_id: saleId,
      total_credit: amount,
      remaining_credit: amount,
      due_date: dueDate,
      status: 'pending'
    }, { transaction });

    // Update customer credit balance
    const customer = await Customer.findByPk(customerId, { transaction });
    if (customer) {
      await customer.increment('credit_balance', { by: amount, transaction });
    }

    return credit;
  },

  async payCredit(creditId, amount, method, transaction = null) {
    const isExternalTransaction = !!transaction;
    const t = transaction || await sequelize.transaction();

    try {
      const credit = await CustomerCredit.findByPk(creditId, { transaction: t });
      if (!credit) throw new Error('Credit record not found');
      if (credit.status === 'paid') throw new Error('Credit already fully paid');

      const paidAmount = parseFloat(amount);
      const newRemaining = parseFloat(credit.remaining_credit) - paidAmount;

      // Create Payment Record
      await CreditPayment.create({
        credit_id: creditId,
        amount: paidAmount,
        payment_method: method
      }, { transaction: t });

      // Update Credit Status
      await credit.update({
        paid_credit: parseFloat(credit.paid_credit) + paidAmount,
        remaining_credit: newRemaining,
        status: newRemaining <= 0 ? 'paid' : 'partial'
      }, { transaction: t });

      // Update customer balance
      const customer = await Customer.findByPk(credit.customer_id, { transaction: t });
      if (customer) {
        await customer.decrement('credit_balance', { by: paidAmount, transaction: t });
      } if (!isExternalTransaction) await t.commit();
      return credit;
    } catch (error) {
      if (!isExternalTransaction) await t.rollback();
      throw error;
    }
  }
};




// --- CONTROLLER LOGIC ---

const ApiResponse = require('../utils/response');


  exports.getAll = async (req, res, next) => {
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

  exports.getById = async (req, res, next) => {
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

  exports.pay = async (req, res, next) => {
    try {
      const { amount, method } = req.body;
      const credit = await CreditService.payCredit(req.params.id, amount, method);
      return ApiResponse.success(res, credit, 'Payment recorded successfully');
    } catch (error) {
      next(error);
    }
  }




