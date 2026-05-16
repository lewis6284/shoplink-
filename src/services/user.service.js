const BaseService = require('./base.service');
const User = require('../models/User');
const Shop = require('../models/Shop');
const UserShop = require('../models/UserShop');
const AuditService = require('./audit.service');

class UserService extends BaseService {
  constructor() {
    super(User);
  }

  async getAll(query = {}, options = {}) {
    return await this.model.findAll({
      where: query,
      include: [{ model: Shop, required: false }],  // LEFT JOIN — never drops users with null/orphan ShopId
      attributes: { exclude: ['password_hash'] },
      ...options
    });
  }

  async create(data, userId = null, req = null) {
    // Validate ShopId only for cashier role (Managers can now be global/null)
    if (data.role === 'cashier' && !data.ShopId) {
      throw new Error(`ShopId is required for ${data.role} role`);
    }

    // Encrypt password if provided (AuthService handles this usually, but for CRUD we do it here)
    if (data.password) {
      const bcrypt = require('bcryptjs');
      data.password_hash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }

    const user = await this.model.create(data);
    
    // Fill UserShops for multi-shop support if ShopId is provided
    if (data.ShopId && (data.role === 'manager' || data.role === 'cashier')) {
      await UserShop.create({
        UserId: user.id,
        ShopId: data.ShopId,
        role_in_shop: data.role
      });
    }

    const result = await this.getById(user.id);

    if (userId) {
      await AuditService.log(
        userId,
        'USER_CREATE',
        'Users',
        user.id,
        null,
        result.toJSON(),
        req
      );
    }

    return result;
  }

  async update(id, data, userId = null, req = null) {
    const user = await this.getById(id);
    const oldValues = user.toJSON();

    if (data.password) {
      const bcrypt = require('bcryptjs');
      data.password_hash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }

    await user.update(data);
    
    // Update or Create UserShops entry if ShopId or role changed
    if (data.ShopId || data.role) {
      const shopId = data.ShopId || user.ShopId;
      const role = data.role || user.role;
      
      if (shopId && (role === 'manager' || role === 'cashier')) {
        await UserShop.upsert({
          UserId: id,
          ShopId: shopId,
          role_in_shop: role
        });
      }
    }
    const result = await this.getById(user.id);

    if (userId) {
      await AuditService.log(
        userId,
        'USER_UPDATE',
        'Users',
        id,
        oldValues,
        result.toJSON(),
        req
      );
    }

    return result;
  }
}

module.exports = new UserService();
