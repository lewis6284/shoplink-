const BaseService = require('./base.service');
const Supplier = require('../models/Supplier');

class SupplierService extends BaseService {
  constructor() {
    super(Supplier);
  }
}

module.exports = new SupplierService();
