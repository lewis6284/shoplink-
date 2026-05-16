const BaseController = require('./base.controller');
const supplierService = require('../services/supplier.service');

class SupplierController extends BaseController {
  constructor() {
    super(supplierService);
  }
}

module.exports = new SupplierController();
