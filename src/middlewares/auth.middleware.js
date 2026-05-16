const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/response');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Authorization header missing or invalid', 401);
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id);

    if (!user || !user.is_active) {
      return ApiResponse.error(res, 'User not found or deactivated', 401);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return ApiResponse.error(res, 'Invalid or expired token', 401);
  }
};

module.exports = authMiddleware;
