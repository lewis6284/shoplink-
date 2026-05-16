const BaseService = require('./base.service');
const Customer = require('../models/Customer');

class CustomerService extends BaseService {
  constructor() {
    super(Customer);
  }
}

module.exports = new CustomerService();
