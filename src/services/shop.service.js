const BaseService = require('./base.service');
const Shop = require('../models/Shop');
const AuditService = require('./audit.service');

class ShopService extends BaseService {
  constructor() {
    super(Shop);
  }

  async create(data, userId = null, req = null) {
    const shop = await this.model.create(data);
    
    if (userId) {
      await AuditService.log(
        userId,
        'SHOP_CREATE',
        'Shops',
        shop.id,
        null,
        shop.toJSON(),
        req
      );
    }
    
    return shop;
  }

  async update(id, data, userId = null, req = null) {
    const shop = await this.getById(id);
    const oldValues = shop.toJSON();
    
    await shop.update(data);
    
    if (userId) {
      await AuditService.log(
        userId,
        'SHOP_UPDATE',
        'Shops',
        id,
        oldValues,
        shop.toJSON(),
        req
      );
    }
    
    return shop;
  }
}

module.exports = new ShopService();
