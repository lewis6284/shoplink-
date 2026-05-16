const AuditLog = require('../models/AuditLog');

/**
 * Audit Service
 * Centralized logging for all system mutations.
 */
class AuditService {
  /**
   * Centralized logging for all system mutations.
   * Supports both object-based arguments and positional arguments for compatibility.
   */
  static async log(args) {
    try {
      let data;
      if (typeof args === 'object' && !Array.isArray(args) && args.actionType) {
        // Object-based call
        data = args;
      } else {
        // Positional call: (userId, actionType, tableName, entityId, oldValues, newValues, req)
        const [userId, actionType, tableName, entityId, oldValues, newValues, req] = arguments;
        data = {
          userId,
          actionType,
          tableName,
          oldValues,
          newValues,
          shopId: req?.shopId || null
        };
      }

      await AuditLog.create({
        user_id: data.userId,
        ShopId: data.shopId || data.ShopId,
        action_type: data.actionType,
        table_name: data.tableName,
        old_values: data.oldValues,
        new_values: data.newValues
      });
    } catch (error) {
      console.error('🔥 Audit Log Failed:', error);
      // Fail silently to not block the main transaction
    }
  }
}

module.exports = AuditService;
