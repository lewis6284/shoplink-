const Notification = require('../models/Notification');
const ApiResponse = require('../utils/response');

class NotificationController {
  static async getAll(req, res, next) {
    try {
      const notifications = await Notification.findAll({
        order: [['createdAt', 'DESC']]
      });
      return ApiResponse.success(res, notifications);
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const notification = await Notification.findByPk(req.params.id);
      if (!notification) return ApiResponse.error(res, 'Notification not found', 404);
      
      await notification.update({ is_read: true });
      return ApiResponse.success(res, notification, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;
