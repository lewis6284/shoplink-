const BaseController = require('./base.controller');
const customerService = require('../services/customer.service');

class CustomerController extends BaseController {
  constructor() {
    super(customerService);
  }
}

module.exports = new CustomerController();
