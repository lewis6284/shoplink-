const SyncQueue = require('../models/SyncQueue');
const SaleService = require('./sale.service');
const { sequelize } = require('../config/database');

class SyncService {
  /**
   * Sync a batch of sales from offline storage
   */
  static async syncSales(salesBatch, userId, req = null) {
    const results = {
      synced: [],
      failed: [],
      duplicates: []
    };

    for (const item of salesBatch) {
      const { localId, data } = item;

      // 1. Check for duplication (Idempotency)
      const existing = await SyncQueue.findOne({
        where: { entity_type: 'sale', entity_id: localId, sync_status: 'synced' }
      });

      if (existing) {
        results.duplicates.push(localId);
        continue;
      }

      // 2. Process Sync
      try {
        const sale = await SaleService.createSale(data.sale, data.items, userId, req);
        
        // 3. Mark as synced in Queue
        await SyncQueue.create({
          entity_type: 'sale',
          entity_id: localId,
          payload: data,
          sync_status: 'synced'
        });

        results.synced.push({ localId, remoteId: sale.id });
      } catch (error) {
        console.error(`Sync failed for sale ${localId}:`, error);
        
        await SyncQueue.create({
          entity_type: 'sale',
          entity_id: localId,
          payload: data,
          sync_status: 'failed',
          last_error: error.message
        });

        results.failed.push({ localId, error: error.message });
      }
    }

    return results;
  }
}

module.exports = SyncService;
