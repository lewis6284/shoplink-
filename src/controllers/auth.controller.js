const AuthService = require('../services/auth.service');
const ApiResponse = require('../utils/response');

class AuthController {
  static async register(req, res, next) {
    try {
      const user = await AuthService.register(req.body);
      return ApiResponse.success(res, user, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      console.log('[AUTH] Raw body:', JSON.stringify(req.body));
      const { email, password } = req.body;
      const data = await AuthService.login(email, password, req);
      return ApiResponse.success(res, data, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  static async loginWithPin(req, res, next) {
    try {
      const { pinCode } = req.body;
      const data = await AuthService.loginWithPin(pinCode, req);
      return ApiResponse.success(res, data, 'Quick login successful');
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const data = await AuthService.refreshToken(refreshToken);
      return ApiResponse.success(res, data, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  static async me(req, res, next) {
    try {
      // User info is attached by auth middleware
      return ApiResponse.success(res, req.user, 'Current user retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
