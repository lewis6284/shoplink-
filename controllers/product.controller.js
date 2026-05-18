
// --- SERVICE LOGIC INLINED ---

const Product = require('../models/Product');
const GlobalStock = require('../models/GlobalStock');
const Stock = require('../models/Stock');
const Shop = require('../models/Shop');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { sequelize } = require('../config/database');
const AuditService = require('../utils/audit');

const ProductService = {


  async getAll(query = {}, options = {}) {
    return await Product.findAll({
      where: query,
      include: [
        { model: Category },
        { model: Brand },
        { model: GlobalStock }
      ],
      ...options
    });
  },

  async getById(id, options = {}) {
    const product = await Product.findByPk(id, {
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
  },

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
      const product = await Product.create(data, { transaction });

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
  },

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
};




// --- CONTROLLER LOGIC ---


const ApiResponse = require('../utils/response');




  exports.create = async (req, res, next) => {
    try {
      console.log("DEBUG: Product Create Body:", req.body);
      const { images, ...productData } = req.body;
      
      if (Number(productData.sellingPrice) <= Number(productData.purchasePrice)) {
        console.warn("DEBUG: Price check failed", { selling: productData.sellingPrice, purchase: productData.purchasePrice });
        return ApiResponse.error(res, 'Selling price must be greater than purchase price', 400);
      }

      const product = await ProductService.create(productData, images, req.user?.id, req);
      console.log("DEBUG: Product created:", product.id);
      return ApiResponse.success(res, product, 'Product created successfully', 201);
    } catch (error) {
      console.error("DEBUG: Create Error:", error);
      next(error);
    }
  };

  exports.update = async (req, res, next) => {
    try {
      const { purchasePrice, sellingPrice } = req.body;
      
      if (purchasePrice && sellingPrice && Number(sellingPrice) <= Number(purchasePrice)) {
        return ApiResponse.error(res, 'Selling price must be greater than purchase price', 400);
      }

      const product = await ProductService.update(req.params.id, req.body, req.user.id, req);
      return ApiResponse.success(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  };





exports.getAll = async (req, res, next) => {
  try {
    const query = { ...req.query };
    if (req.shopId) {
      const { Op } = require('sequelize');
      query.ShopId = {
        [Op.or]: [req.shopId, null]
      };
    }
    const records = await ProductService.getAll(query);
    return ApiResponse.success(res, records);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const records = await ProductService.getById(req.params.id);
    return ApiResponse.success(res, records);
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    let existing = await Product.findByPk(req.params.id);
    if (!existing) {
      return ApiResponse.error(res, 'Record not found', 404);
    }
    await existing.destroy();
    return ApiResponse.success(res, null, 'Deleted successfully');
  } catch (error) {
    next(error);
  }
};
