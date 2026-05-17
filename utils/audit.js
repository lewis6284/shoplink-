const AuditLog = require('../models/AuditLog');

const AuditService = {
  async log({ userId, shopId, actionType, tableName, oldValues, newValues }) {
    try {
      if (!AuditLog) return;
      await AuditLog.create({
        UserId: userId || null,
        ShopId: shopId || null,
        action: actionType || 'SYSTEM_ACTION',
        details: {
          table: tableName,
          oldValues: oldValues || null,
          newValues: newValues || null
        }
      });
    } catch (error) {
      console.error('AuditLog error:', error);
    }
  }
};

module.exports = AuditService;
