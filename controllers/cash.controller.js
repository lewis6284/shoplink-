
// --- SERVICE LOGIC INLINED ---
const CashRegister = require('../models/CashRegister');
const CashMovement = require('../models/CashMovement');
const CashSession = require('../models/CashSession');
const { literal } = require('sequelize');

const CashService = {
  /**
   * Records a cash movement linked to a specific register using atomic update
   */
  async recordMovement(registerId, amount, type, reason, referenceId, transaction = null) {
    const amountNum = parseFloat(amount);
    
    // Use literal increment/decrement to avoid lock wait timeout and ensure atomicity at DB level
    const sign = type === 'IN' ? '+' : '-';
    
    // 1. Update balance atomically
    const [affectedRows] = await CashRegister.update(
      { balance: literal(`balance ${sign} ${amountNum}`) },
      { where: { id: registerId }, transaction }
    );

    if (affectedRows === 0) throw new Error('Cash register not found');

    // 2. Create movement record
    const movement = await CashMovement.create({
      CashRegisterId: registerId,
      amount: amountNum,
      type,
      reason,
      referenceId
    }, { transaction });

    return { movement };
  },

  async openSession({ CashRegisterId, UserId, ShopId, opening_balance = 0 }) {
    const transaction = await CashSession.sequelize.transaction();
    try {
      // create session
      const session = await CashSession.create({ CashRegisterId, UserId, ShopId, opening_balance, opened_at: new Date(), status: 'open' }, { transaction });

      // mark register open
      await CashRegister.update({ status: 'open' }, { where: { id: CashRegisterId }, transaction });

      await transaction.commit();
      return session;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async closeSession(sessionId, { closing_balance = 0, closing_user_id = null } = {}) {
    const transaction = await CashSession.sequelize.transaction();
    try {
      const session = await CashSession.findByPk(sessionId, { transaction });
      if (!session) throw new Error('Cash session not found');

      session.closing_balance = closing_balance;
      session.closed_at = new Date();
      session.status = 'closed';
      await session.save({ transaction });

      // If no other open sessions for register, close register
      const openCount = await CashSession.count({ where: { CashRegisterId: session.CashRegisterId, status: 'open' }, transaction });
      if (openCount === 0) {
        await CashRegister.update({ status: 'closed' }, { where: { id: session.CashRegisterId }, transaction });
      }

      await transaction.commit();
      return session;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};




// --- CONTROLLER LOGIC ---

const ApiResponse = require('../utils/response');



  exports.open = async (req, res, next) => {
    try {
      const { CashRegisterId, opening_balance } = req.body;
      const shopId = req.shopId || req.user?.ShopId || null;
      const session = await CashService.openSession({ CashRegisterId, UserId: req.user.id, ShopId: shopId, opening_balance });
      await AuditService.log({ userId: req.user.id, shopId, actionType: 'CASH_OPEN', tableName: 'CashSessions', newValues: session.toJSON() });
      return ApiResponse.success(res, session, 'Cash register opened');
    } catch (error) {
      next(error);
    }
  }

  exports.close = async (req, res, next) => {
    try {
      const { sessionId, closing_balance } = req.body;
      const session = await CashService.closeSession(sessionId, { closing_balance, closing_user_id: req.user.id });
      await AuditService.log({ userId: req.user.id, shopId: session.ShopId, actionType: 'CASH_CLOSE', tableName: 'CashSessions', newValues: session.toJSON() });
      return ApiResponse.success(res, session, 'Cash register closed');
    } catch (error) {
      next(error);
    }
  }




