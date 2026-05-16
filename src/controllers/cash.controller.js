const CashService = require('../services/cash.service');
const ApiResponse = require('../utils/response');
const AuditService = require('../services/audit.service');

class CashController {
  static async open(req, res, next) {
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

  static async close(req, res, next) {
    try {
      const { sessionId, closing_balance } = req.body;
      const session = await CashService.closeSession(sessionId, { closing_balance, closing_user_id: req.user.id });
      await AuditService.log({ userId: req.user.id, shopId: session.ShopId, actionType: 'CASH_CLOSE', tableName: 'CashSessions', newValues: session.toJSON() });
      return ApiResponse.success(res, session, 'Cash register closed');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CashController;
