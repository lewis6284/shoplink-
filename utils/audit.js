const AuditLog = require('../models/AuditLog');

const AuditService = {
  /**
   * Log system events to the compliance audit ledger
   */
  async log({ userId, shopId, actionType, tableName, oldValues, newValues }) {
    try {
      if (!AuditLog) return;
      await AuditLog.create({
        user_id: userId || null,
        ShopId: shopId || null,
        action_type: actionType || 'SYSTEM_ACTION',
        table_name: tableName || null,
        old_values: oldValues || null,
        new_values: newValues || null
      });
    } catch (error) {
      console.error('AuditLog writing error:', error);
    }
  }
};

module.exports = AuditService;
