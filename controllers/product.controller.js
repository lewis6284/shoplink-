
// --- SERVICE LOGIC INLINED ---

const Product = require('../models/Product');
const GlobalStock = require('../models/GlobalStock');
const Stock = require('../models/Stock');
const Shop = require('../models/Shop');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Unit = require('../models/Unit');
const { sequelize } = require('../config/database');
const AuditService = require('../utils/audit');

const ProductService = {
  _sanitizeDecimalPayload(data) {
    const payload = { ...data };
    ['partnerPrice', 'wholesalePrice'].forEach((field) => {
      if (payload[field] === '' || payload[field] === null) {
        delete payload[field];
      }
    });
    return payload;
  },

  async getAll(query = {}, options = {}) {
    return await Product.findAll({
      where: query,
      include: [
        { model: Category },
        { model: Brand },
        { model: Unit },
        { model: GlobalStock },
        { model: Stock }
      ],
      ...options
    });
  },

  async getById(id, options = {}) {
    const product = await Product.findByPk(id, {
      include: [
        { model: Category },
        { model: Brand },
        { model: Unit },
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
      const normalizedData = this._sanitizeDecimalPayload(data);
      const product = await Product.create(normalizedData, { transaction });

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
    const normalizedData = this._sanitizeDecimalPayload(data);

    await product.update(normalizedData);

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

      // Enforce ShopId Scoping
      if (req.user && req.user.role !== 'owner') {
          // Non-owners are strictly bound to their own shop
          productData.ShopId = req.shopId;
      } else {
          // Owner can assign ShopId via body; empty string becomes null (Global)
          if (productData.ShopId === "" || productData.ShopId === "global") {
              productData.ShopId = null;
          }
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

      const updateData = { ...req.body };

      // Enforce ShopId Scoping for updates
      if (req.user && req.user.role !== 'owner') {
          delete updateData.ShopId; // Non-owners cannot move a product to another shop
      } else if (updateData.ShopId !== undefined) {
          if (updateData.ShopId === "" || updateData.ShopId === "global") {
              updateData.ShopId = null;
          }
      }

      const product = await ProductService.update(req.params.id, updateData, req.user.id, req);
      return ApiResponse.success(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  };





exports.getAll = async (req, res, next) => {
  try {
    const { search, in_stock, limit, ...restQuery } = req.query;
    const { Op } = require('sequelize');
    const query = { ...restQuery };
    const posCatalog = in_stock === 'true';

    // POS catalog requires an active shop (X-Shop-Id header)
    if (posCatalog && !req.shopId) {
      return ApiResponse.success(res, []);
    }

    // Shop catalog: this shop's products plus global (null ShopId) items
    if (req.shopId) {
      query.ShopId = { [Op.or]: [req.shopId, null] };
    }

    if (search) {
      query[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } },
        { product_code: { [Op.like]: `%${search}%` } }
      ];
    }

    // POS: only products with stock quantity > 0 at the active shop (no default cap)
    let stockIncludeOptions = {};
    if (posCatalog) {
      stockIncludeOptions = {
        model: Stock,
        where: {
          ShopId: req.shopId,
          quantity: { [Op.gt]: 0 }
        },
        required: true
      };
    }

    const findOptions = {
      where: query,
      include: [
        { model: Category },
        { model: Brand },
        { model: Unit },
        { model: GlobalStock },
        posCatalog ? stockIncludeOptions : { model: Stock, ...(req.shopId ? { where: { ShopId: req.shopId }, required: false } : {}) }
      ]
    };
    if (limit) {
      findOptions.limit = parseInt(limit, 10);
    }

    const records = await Product.findAll(findOptions);
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
    const oldValues = existing.toJSON();
    await existing.destroy();

    if (req.user?.id) {
      await AuditService.log({
        userId: req.user.id,
        shopId: req.shopId,
        actionType: 'PRODUCT_DELETE',
        tableName: 'Products',
        oldValues
      });
    }

    return ApiResponse.success(res, null, 'Deleted successfully');
  } catch (error) {
    next(error);
  }
};
