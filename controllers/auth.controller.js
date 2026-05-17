
// --- SERVICE LOGIC INLINED ---
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const AuditService = require('../utils/audit');
require('dotenv').config();

const AuthService = {
  /**
   * Login user with email/password
   */
  async login(email, password, req = null) {
    const cleanEmail = String(email || '').replace(/\s/g, '').toLowerCase();
    const cleanPassword = String(password || '').trim();

    console.log(`[AUTH] Login attempt: email=${cleanEmail}`);
    const user = await User.findOne({ where: { email: cleanEmail } });

    if (!user) {
      console.log(`[AUTH] User NOT found for email: ${email}`);
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    console.log(`[AUTH] User found: ${user.id}, role: ${user.role}, stored_hash: ${user.password_hash}`);
    
    const isMatch = await user.comparePassword(cleanPassword);
    console.log(`[AUTH] Password match result: ${isMatch}`);

    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    return await this.generateUserSession(user, req);
  },

  /**
   * Quick Login with PIN code
   */
  
  async loginWithPin(pinCode, req = null) {
    const user = await User.findOne({ where: { pin_code: pinCode } });

    if (!user) {
      const error = new Error('Invalid PIN code');
      error.status = 401;
      throw error;
    }

    return await this.generateUserSession(user, req);
  },

  /**
   * Generate JWT + Session entry
   */

  async generateUserSession(user, req = null) {
    if (!user.is_active) {
      const error = new Error('User account is deactivated');
      error.status = 403;
      throw error;
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // JWT Payload
    const payload = { 
      id: user.id, 
      role: user.role, 
      ShopId: user.ShopId 
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Store Session in DB
    await Session.create({
      UserId: user.id,
      token: token,
      ip_address: req ? req.ip : null,
      device_info: req ? req.headers['user-agent'] : null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Audit Log
    await AuditService.log({
      userId: user.id,
      shopId: user.ShopId,
      actionType: 'USER_LOGIN',
      tableName: 'users',
      newValues: { last_login: user.last_login }
    });

    const userJson = user.toJSON();
    delete userJson.password_hash;

    return { 
      user: userJson, 
      token 
    };
  },

  /**
   * Register logic (Owner only or Invite based in SaaS)
   */
  
  async register(userData) {
    const { email } = userData;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const error = new Error('Email already registered');
      error.status = 400;
      throw error;
    }

    const user = await User.create(userData);
    const userJson = user.toJSON();
    delete userJson.password_hash;
    return userJson;
  }
};




// --- CONTROLLER LOGIC ---

const ApiResponse = require('../utils/response');


  exports.register = async (req, res, next) => {
    try {
      const user = await AuthService.register(req.body);
      return ApiResponse.success(res, user, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  exports.login = async (req, res, next) => {
    try {
      console.log('[AUTH] Raw body:', JSON.stringify(req.body));
      const { email, password } = req.body;
      const data = await AuthService.login(email, password, req);
      return ApiResponse.success(res, data, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  exports.loginWithPin = async (req, res, next) => {
    try {
      const { pinCode } = req.body;
      const data = await AuthService.loginWithPin(pinCode, req);
      return ApiResponse.success(res, data, 'Quick login successful');
    } catch (error) {
      next(error);
    }
  }

  exports.refresh = async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const data = await AuthService.refreshToken(refreshToken);
      return ApiResponse.success(res, data, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  exports.me = async (req, res, next) => {
    try {
      // User info is attached by auth middleware
      return ApiResponse.success(res, req.user, 'Current user retrieved');
    } catch (error) {
      next(error);
    }
  }




