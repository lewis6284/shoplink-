/**
 * SHOPLINK SYNC HAMMER - Stress Test System
 * Simulation of massive concurrent offline synchronization
 */
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// --- CONFIGURATION ---
const BASE_URL = 'http://localhost:5000/api';
const DEVICE_COUNT = 5;        // Number of simultaneous devices
const SALES_PER_DEVICE = 5;    // Sales made offline by each device
const DUPLICATE_RATE = 0.2;    // 20% of requests will be duplicated
const JITTER_MS = 1000;        // Random delay simulation (ms)
const PRODUCT_ID = '';         // To be filled from DB
const CATEGORY_ID = '';        // To be filled from DB

class POSDevice {
  constructor(id, token) {
    this.deviceId = id;
    this.token = token;
    this.offlineQueue = [];
    this.stats = { success: 0, rejected: 0, errors: 0 };
  }

  // Simulate making sales offline
  prepareOfflineSales(productId, count) {
    for (let i = 0; i < count; i++) {
      this.offlineQueue.push({
        localId: `OFFLINE-${this.deviceId}-${uuidv4()}`,
        data: {
          sale: {
            paymentMethod: 'CASH',
            totalAmount: 1500,
            registerId: null // Service will use default
          },
          items: [
            {
              ProductId: productId,
              quantity: 1,
              unitPrice: 1500,
              subTotal: 1500,
              unitCostSnapshot: 800
            }
          ]
        }
      });
    }
  }

  // Simulate sync storm
  async sync() {
    console.log(`[Device ${this.deviceId}] Starting sync storm...`);
    
    // Process queue with random network delays
    const promises = this.offlineQueue.map(async (item) => {
      await new Promise(r => setTimeout(r, Math.random() * JITTER_MS));
      
      try {
        const payload = { batch: [item] };
        
        // 1. Initial Sync Attempt
        const response = await this.sendSync(payload);
        this.updateStats(response);

        // 2. Simulate Duplicate Request (Idempotency Test)
        if (Math.random() < DUPLICATE_RATE) {
          console.log(`[Device ${this.deviceId}] Sending intentional duplicate for ${item.localId}`);
          const dupResponse = await this.sendSync(payload);
          this.updateStats(dupResponse);
        }

      } catch (err) {
        this.stats.errors++;
        console.error(`[Device ${this.deviceId}] Fatal Sync Error:`, err.message);
      }
    });

    await Promise.all(promises);
  }

  async sendSync(payload) {
    return axios.post(`${BASE_URL}/sync/sales`, payload, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
  }

  updateStats(response) {
    const data = response.data.data;
    if (data.synced && data.synced.length > 0) this.stats.success++;
    if (data.duplicates && data.duplicates.length > 0) this.stats.rejected++;
    if (data.failed && data.failed.length > 0) this.stats.errors++;
  }
}

async function runHammerTest() {
  console.log('--- STARTING SHOPLINK SYNC HAMMER ---');
  
  try {
    // 1. Login to get token
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@shoplink.com',
      password: 'Admin@1234'
    });
    const token = loginRes.data.data.token;

    // 2. Setup Data (Find a product and its initial stock)
    const prodRes = await axios.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const product = prodRes.data.data[0];
    if (!product) throw new Error('No products found to test. Please seed the DB.');
    
    console.log(`Testing with Product: ${product.name} (ID: ${product.id})`);

    // 3. Initialize Devices
    const devices = [];
    for (let i = 1; i <= DEVICE_COUNT; i++) {
      const dev = new POSDevice(i, token);
      dev.prepareOfflineSales(product.id, SALES_PER_DEVICE);
      devices.push(dev);
    }

    // 4. EXECUTE STORM
    console.log(`Spawning ${DEVICE_COUNT} devices...`);
    const startTime = Date.now();
    await Promise.all(devices.map(d => d.sync()));
    const endTime = Date.now();

    // 5. FINAL REPORT
    console.log('\n--- Hammer Test Final Report ---');
    console.log(`Total Devices: ${DEVICE_COUNT}`);
    console.log(`Execution Time: ${(endTime - startTime) / 1000}s`);
    
    const totalStats = devices.reduce((acc, dev) => {
      acc.success += dev.stats.success;
      acc.rejected += dev.stats.rejected;
      acc.errors += dev.stats.errors;
      return acc;
    }, { success: 0, rejected: 0, errors: 0 });

    console.log(`Total Sales Synced: ${totalStats.success}`);
    console.log(`Total Duplicates Prevented: ${totalStats.rejected}`);
    console.log(`Total Failures: ${totalStats.errors}`);

    // 6. DB CONSISTENCY VERIFICATION
    // We will verify this via a direct DB check after the script
    console.log('\n[!] VERIFICATION REQUIRED: Run "npm run verify-integrity"');

  } catch (err) {
    console.error('STRESS TEST CRASHED:', err.message);
  }
}

runHammerTest();
