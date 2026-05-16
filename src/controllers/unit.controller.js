const BaseController = require('./base.controller');
const unitService = require('../services/unit.service');

class UnitController extends BaseController {
  constructor() {
    super(unitService);
  }
}

module.exports = new UnitController();
