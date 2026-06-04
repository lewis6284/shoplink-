const express = require('express');
const CompanySettingController = require('../controllers/companySetting.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const upload = require('../utils/upload');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['owner']));

router.get('/', CompanySettingController.getAll);
router.get('/:id', CompanySettingController.getById);
router.post('/', upload.single('stamp'), CompanySettingController.create);
router.patch('/:id', upload.single('stamp'), CompanySettingController.update);
router.delete('/:id', CompanySettingController.delete);

module.exports = router;
