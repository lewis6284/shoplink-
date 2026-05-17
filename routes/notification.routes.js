const express = require('express');
const NotificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', NotificationController.getAll);
router.patch('/:id/read', NotificationController.markAsRead);

module.exports = router;
