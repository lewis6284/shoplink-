
// --- SERVICE LOGIC INLINED ---
const StockTransfer = require('../models/StockTransfer');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const { sequelize } = require('../config/database');
const AuditService = require('../utils/audit');

const StockTransferService = {
  async getAll(query = {}, options = {}) {
    return await StockTransfer.findAll({
      where: query,
      include: [
        { model: Product },
        { model: Shop, as: 'FromShop' },
        { model: Shop, as: 'ToShop' }
      ],
      ...options
    });
  },

  async create(data, userId, req = null) {
    // Map both upper and lower case to handle frontend vs backend casing mismatches safely
    const ProductId = data.ProductId || data.product_id;
    const Quantity = data.Quantity || data.quantity;
    const FromShopId = data.FromShopId || data.fromShopId;
    const ToShopId = data.ToShopId || data.toShopId;
    const { notes, estimated_arrival_date, status = 'PENDING' } = data;

    // Verify FromShop has enough stock (Available quantity)
    const fromStock = await Stock.findOne({
      where: { ProductId, ShopId: FromShopId || null }
    });

    if (!fromStock || Number(fromStock.quantity) < Number(Quantity)) {
      throw new Error('Insufficient available stock in the source shop/warehouse');
    }

    const transfer = await StockTransfer.create({
      ProductId,
      Quantity,
      FromShopId,
      ToShopId,
      CreatedBy: userId,
      notes,
      estimated_arrival_date,
      status // Can be DRAFT or PENDING
    });

    await AuditService.log(userId, 'TRANSFER_CREATE', 'StockTransfers', transfer.id, null, transfer.toJSON(), req);
    
    return transfer;
  },

  async approve(transferId, userId, req = null) {
    const transaction = await sequelize.transaction();
    try {
      const transfer = await StockTransfer.findByPk(transferId, { transaction });
      if (!transfer || transfer.status !== 'PENDING') throw new Error('Transfer must be in PENDING state');

      // Reserve the stock
      const fromStock = await Stock.findOne({
        where: { ProductId: transfer.ProductId, ShopId: transfer.FromShopId },
        transaction
      });

      if (!fromStock || Number(fromStock.quantity) < Number(transfer.Quantity)) {
        throw new Error('Insufficient stock to approve transfer');
      }

      // Move from available to reserved
      await fromStock.decrement('quantity', { by: transfer.Quantity, transaction });
      await fromStock.increment('reserved_quantity', { by: transfer.Quantity, transaction });

      await transfer.update({
        status: 'APPROVED',
        ApprovedBy: userId
      }, { transaction });

      await transaction.commit();
      await AuditService.log(userId, 'TRANSFER_APPROVE', 'StockTransfers', transferId, { status: 'PENDING' }, { status: 'APPROVED' }, req);
      return transfer;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async dispatch(transferId, userId, req = null) {
    const transfer = await StockTransfer.findByPk(transferId);
    if (!transfer || transfer.status !== 'APPROVED') throw new Error('Transfer must be APPROVED first');

    await transfer.update({ status: 'IN_TRANSIT' });
    await AuditService.log(userId, 'TRANSFER_DISPATCH', 'StockTransfers', transferId, { status: 'APPROVED' }, { status: 'IN_TRANSIT' }, req);
    return transfer;
  },

  async receive(transferId, userId, req = null) {
    const transaction = await sequelize.transaction();
    try {
      const transfer = await StockTransfer.findByPk(transferId, { transaction });
      if (!transfer || (transfer.status !== 'IN_TRANSIT' && transfer.status !== 'APPROVED')) {
        throw new Error('Transfer must be APPROVED or IN_TRANSIT');
      }

      // 1. Remove from Source's Reserved
      const fromStock = await Stock.findOne({
        where: { ProductId: transfer.ProductId, ShopId: transfer.FromShopId },
        transaction
      });
      
      if (!fromStock || Number(fromStock.reserved_quantity) < Number(transfer.Quantity)) {
        throw new Error('Inconsistency: Insufficient reserved stock in source');
      }
      await fromStock.decrement('reserved_quantity', { by: transfer.Quantity, transaction });

      // 2. Add to Destination's Available
      let toStock = await Stock.findOne({
        where: { ProductId: transfer.ProductId, ShopId: transfer.ToShopId },
        transaction
      });

      if (!toStock) {
        toStock = await Stock.create({
          ProductId: transfer.ProductId,
          ShopId: transfer.ToShopId,
          quantity: transfer.Quantity
        }, { transaction });
      } else {
        await toStock.increment('quantity', { by: transfer.Quantity, transaction });
      }

      // 3. Update Transfer Status
      await transfer.update({
        status: 'RECEIVED',
        ReceivedBy: userId,
        receivedAt: new Date()
      }, { transaction });

      await transaction.commit();
      await AuditService.log(userId, 'TRANSFER_RECEIVE', 'StockTransfers', transferId, { status: transfer.status }, { status: 'RECEIVED' }, req);

      return transfer;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async cancel(transferId, userId, req = null) {
    const transaction = await sequelize.transaction();
    try {
      const transfer = await StockTransfer.findByPk(transferId, { transaction });
      if (!transfer || (transfer.status !== 'PENDING' && transfer.status !== 'APPROVED')) {
        throw new Error('Cannot cancel transfer in current state');
      }

      // If approved, release reserved stock back to available
      if (transfer.status === 'APPROVED') {
        const fromStock = await Stock.findOne({
          where: { ProductId: transfer.ProductId, ShopId: transfer.FromShopId },
          transaction
        });
        if (fromStock) {
          await fromStock.decrement('reserved_quantity', { by: transfer.Quantity, transaction });
          await fromStock.increment('quantity', { by: transfer.Quantity, transaction });
        }
      }

      await transfer.update({ status: 'CANCELLED' }, { transaction });
      await transaction.commit();
      await AuditService.log(userId, 'TRANSFER_CANCEL', 'StockTransfers', transferId, { status: transfer.status }, { status: 'CANCELLED' }, req);
      return transfer;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};




// --- CONTROLLER LOGIC ---

const ApiResponse = require('../utils/response');


exports.getAll = async (req, res, next) => {
    try {
      const query = {};
      if (req.user.role !== 'owner') {
        // Managers see transfers related to their shop
        query[require('sequelize').Op.or] = [
          { FromShopId: req.user.ShopId },
          { ToShopId: req.user.ShopId }
        ];
      }
      const transfers = await StockTransferService.getAll(query, { order: [['createdAt', 'DESC']] });
      return ApiResponse.success(res, transfers);
    } catch (error) {
      next(error);
    }
  },

exports.create = async (req, res, next) => {
    try {
      const transfer = await StockTransferService.create(req.body, req.user.id, req);
      return ApiResponse.success(res, transfer, 'Transfer initiated', 201);
    } catch (error) {
      next(error);
    }
  },

exports.approve = async (req, res, next) => {
    try {
      const transfer = await StockTransferService.approve(req.params.id, req.user.id, req);
      return ApiResponse.success(res, transfer, 'Transfer approved and stock reserved');
    } catch (error) {
      next(error);
    }
  },

exports.dispatch = async (req, res, next) => {
    try {
      const transfer = await StockTransferService.dispatch(req.params.id, req.user.id, req);
      return ApiResponse.success(res, transfer, 'Stock dispatched and in transit');
    } catch (error) {
      next(error);
    }
  },

exports.receive = async (req, res, next) => {
    try {
      const transfer = await StockTransferService.receive(req.params.id, req.user.id, req);
      return ApiResponse.success(res, transfer, 'Stock received successfully');
    } catch (error) {
      next(error);
    }
  },

exports.cancel = async (req, res, next) => {
    try {
      const transfer = await StockTransferService.cancel(req.params.id, req.user.id, req);
      return ApiResponse.success(res, transfer, 'Transfer cancelled');
    } catch (error) {
      next(error);
    }
  }




