const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const AuditService = require('./audit.service');
require('dotenv').config();

class AuthService {
  /**
   * Login user with email/password
   */
  static async login(email, password, req = null) {
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
  }

  /**
   * Quick Login with PIN code
   */
  static async loginWithPin(pinCode, req = null) {
    const user = await User.findOne({ where: { pin_code: pinCode } });

    if (!user) {
      const error = new Error('Invalid PIN code');
      error.status = 401;
      throw error;
    }

    return await this.generateUserSession(user, req);
  }

  /**
   * Generate JWT + Session entry
   */
  static async generateUserSession(user, req = null) {
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
  }

  /**
   * Register logic (Owner only or Invite based in SaaS)
   */
  static async register(userData) {
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
}

module.exports = AuthService;
