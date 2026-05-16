const BaseController = require('./base.controller');
const shopService = require('../services/shop.service');

class ShopController extends BaseController {
  constructor() {
    super(shopService);
  }
}

module.exports = new ShopController();
