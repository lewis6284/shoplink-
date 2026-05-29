const express = require('express');
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/login-pin', AuthController.loginWithPin);
router.post('/refresh', AuthController.refresh);
router.post('/test-compare', async (req, res) => {
  const { email, password } = req.body;
  const User = require('../models/User');
  const user = await User.findOne({ where: { email } });
  if (!user) return res.json({ found: false });
  const match = await user.comparePassword(password);
  res.json({ found: true, match, email, password, stored_hash: user.password_hash });
});
router.get('/me', authMiddleware, AuthController.me);
router.post('/change-password', authMiddleware, AuthController.changePassword);

module.exports = router;
