const ApiResponse = require('../utils/response');

const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(res, 'Forbidden: You do not have permission', 403);
    }

    next();
  };
};

module.exports = roleMiddleware;
