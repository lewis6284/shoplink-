const { Op, fn, col } = require('sequelize');
const StockMovement = require('../models/StockMovement');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const ApiResponse = require('../utils/response');

exports.getDailySummary = async (req, res, next) => {
    try {
      const { shop_id, date } = req.query;
      const targetDate = date ? new Date(date) : new Date();
      
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const stockWhere = {};
      if (req.user.role !== 'owner') {
        stockWhere.ShopId = req.user.ShopId;
      } else if (shop_id) {
        stockWhere.ShopId = shop_id;
      }

      const summary = await StockMovement.findAll({
        attributes: [
          'type',
          'reason',
          [fn('SUM', col('quantityChange')), 'totalChange'],
          [fn('COUNT', col('id')), 'count']
        ],
        where: {
          createdAt: { [Op.between]: [startOfDay, endOfDay] }
        },
        include: [{
          model: Stock,
          where: stockWhere,
          attributes: []
        }],
        group: ['type', 'reason']
      });

      return ApiResponse.success(res, summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Top Stock Losses
   */
exports.getTopLosses = async (req, res, next) => {
    try {
      const { shop_id, limit = 10 } = req.query;

      const stockWhere = {};
      if (req.user.role !== 'owner') {
        stockWhere.ShopId = req.user.ShopId;
      } else if (shop_id) {
        stockWhere.ShopId = shop_id;
      }

      const losses = await StockMovement.findAll({
        where: { reason: 'LOSS' },
        include: [{
          model: Stock,
          where: stockWhere,
          include: [{ model: Product }]
        }],
        order: [['quantityChange', 'ASC']], // Losses are negative, so ASC gets most negative
        limit: parseInt(limit)
      });

      return ApiResponse.success(res, losses);
    } catch (error) {
      next(error);
    }
  }

