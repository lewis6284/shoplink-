const BaseController = require('./base.controller');
const productService = require('../services/product.service');
const ApiResponse = require('../utils/response');

class ProductController extends BaseController {
  constructor() {
    super(productService);
  }

  create = async (req, res, next) => {
    try {
      console.log("DEBUG: Product Create Body:", req.body);
      const { images, ...productData } = req.body;
      
      if (Number(productData.sellingPrice) <= Number(productData.purchasePrice)) {
        console.warn("DEBUG: Price check failed", { selling: productData.sellingPrice, purchase: productData.purchasePrice });
        return ApiResponse.error(res, 'Selling price must be greater than purchase price', 400);
      }

      const product = await this.service.create(productData, images, req.user?.id, req);
      console.log("DEBUG: Product created:", product.id);
      return ApiResponse.success(res, product, 'Product created successfully', 201);
    } catch (error) {
      console.error("DEBUG: Create Error:", error);
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { purchasePrice, sellingPrice } = req.body;
      
      if (purchasePrice && sellingPrice && Number(sellingPrice) <= Number(purchasePrice)) {
        return ApiResponse.error(res, 'Selling price must be greater than purchase price', 400);
      }

      const product = await this.service.update(req.params.id, req.body, req.user.id, req);
      return ApiResponse.success(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new ProductController();
