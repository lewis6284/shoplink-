const BaseController = require('./base.controller');
const userService = require('../services/user.service');

class UserController extends BaseController {
  constructor() {
    super(userService);
  }
}

module.exports = new UserController();
