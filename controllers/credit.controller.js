
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
      const { search, status } = req.query;
      const { Op } = require('sequelize');

      const creditWhere = {};
      if (status) creditWhere.status = status;

      const customerWhere = {};
      if (search) {
        customerWhere[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ];
      }

      const credits = await CustomerCredit.findAll({
        where: creditWhere,
        include: [{ model: Customer, as: 'customer', where: Object.keys(customerWhere).length ? customerWhere : undefined, required: Object.keys(customerWhere).length > 0 }],
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

  // Create a manual debt/credit for a walk-in client (phone-based)
  exports.createCredit = async (req, res, next) => {
    try {
      const { phone, full_name, address, total_credit, due_date, note, sale_id } = req.body;
      if (!phone || !total_credit) {
        return ApiResponse.error(res, 'phone and total_credit are required', 400);
      }

      // Find or create the debt customer
      let customer = await Customer.findOne({ where: { phone } });
      if (!customer) {
        if (!full_name) return ApiResponse.error(res, 'full_name is required for new debt clients', 400);
        customer = await Customer.create({
          full_name,
          phone,
          address: address || null,
          customer_type: 'retail',
          ShopId: req.shopId || null
        });
      }

      const credit = await CreditService.addCredit(
        customer.id,
        sale_id || null,
        parseFloat(total_credit),
        due_date || null
      );

      // attach note if provided (stored in a simple field)
      if (note) await credit.update({ note });

      const fullCredit = await CustomerCredit.findByPk(credit.id, {
        include: [{ model: Customer, as: 'customer' }]
      });
      return ApiResponse.success(res, fullCredit, 'Debt created successfully', 201);
    } catch (error) {
      next(error);
    }
  }




