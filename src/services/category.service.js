const BaseService = require('./base.service');
const Category = require('../models/Category');

class CategoryService extends BaseService {
  constructor() {
    super(Category);
  }
}

module.exports = new CategoryService();
