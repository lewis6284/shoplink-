const BaseService = require('./base.service');
const Unit = require('../models/Unit');

class UnitService extends BaseService {
  constructor() {
    super(Unit);
  }
}

module.exports = new UnitService();
