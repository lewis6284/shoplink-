const express = require('express');
const SyncController = require('../controllers/sync.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/sales', SyncController.syncSales);

module.exports = router;
