const BaseService = require('./base.service');
const Product = require('../models/Product');
const GlobalStock = require('../models/GlobalStock');
const Stock = require('../models/Stock');
const Shop = require('../models/Shop');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { sequelize } = require('../config/database');
const AuditService = require('./audit.service');

class ProductService extends BaseService {
  constructor() {
    super(Product);
  }

  async getAll(query = {}, options = {}) {
    return await this.model.findAll({
      where: query,
      include: [
        { model: Category },
        { model: Brand },
        { model: GlobalStock }
      ],
      ...options
    });
  }

  async getById(id, options = {}) {
    const product = await this.model.findByPk(id, {
      include: [
        { model: Category },
        { model: Brand },
        { model: GlobalStock }
      ],
      ...options
    });
    if (!product) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    return product;
  }

  async create(data, images = [], userId = null, req = null) {
    console.log("DEBUG: Service.create data:", data);
    const transaction = await sequelize.transaction();
    try {
      // Auto-generate product_code
      if (!data.product_code) {
        const lastProduct = await Product.findOne({
          where: {
            product_code: {
              [sequelize.Sequelize.Op.like]: 'PRD-%'
            }
          },
          order: [['createdAt', 'DESC']],
          attributes: ['product_code'],
          transaction
        });

        let nextNumber = 1;
        if (lastProduct && lastProduct.product_code) {
          const parts = lastProduct.product_code.split('-');
          if (parts.length === 2 && !isNaN(parts[1])) {
            nextNumber = parseInt(parts[1], 10) + 1;
          }
        }
        data.product_code = `PRD-${String(nextNumber).padStart(6, '0')}`;
        console.log("DEBUG: Generated code:", data.product_code);
      }

      // 1. Create Product
      console.log("DEBUG: Creating Product record...");
      const product = await this.model.create(data, { transaction });

      // 2. Initialize Global Stock
      console.log("DEBUG: Initializing Global Stock...");
      await GlobalStock.create({
        ProductId: product.id,
        quantity: data.initialStock || 0
      }, { transaction });

      // 3. Initialize Shop Stocks
      console.log("DEBUG: Initializing Shop Stocks...");
      const shops = await Shop.findAll({ transaction });
      const shopStocks = shops.map(shop => ({
        ShopId: shop.id,
        ProductId: product.id,
        quantity: 0
      }));
      await Stock.bulkCreate(shopStocks, { transaction });

      await transaction.commit();
      console.log("DEBUG: Transaction committed.");
      
      const createdProduct = await this.getById(product.id);
      
      if (userId) {
        await AuditService.log({
          userId,
          shopId: req?.shopId,
          actionType: 'PRODUCT_CREATE',
          tableName: 'Products',
          newValues: createdProduct.toJSON()
        });
      }
      
      return createdProduct;
    } catch (error) {
      console.error("DEBUG: Service.create Transaction Error:", error);
      await transaction.rollback();
      throw error;
    }
  }

  async update(id, data, userId = null, req = null) {
    const product = await this.getById(id);
    const oldValues = product.toJSON();

    await product.update(data);

    if (userId) {
      await AuditService.log({
        userId,
        shopId: req?.shopId,
        actionType: 'PRODUCT_UPDATE',
        tableName: 'Products',
        oldValues,
        newValues: product.toJSON()
      });
    }

    return product;
  }
}

module.exports = new ProductService();
