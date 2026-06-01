/**
 * One-time migration: add partnerPrice + wholesalePrice to Products table.
 * Safe to run multiple times — skips columns that already exist.
 *
 * Usage: node migrate_product_tier_prices.js
 */
require('dotenv').config();
const { sequelize } = require('./config/database');
const Product = require('./models/Product');

async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName] }
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

async function migrate() {
  const tableName = Product.tableName;
  console.log(`Migrating table: ${tableName}`);

  await sequelize.authenticate();

  const hasPartner = await columnExists(tableName, 'partnerPrice');
  const hasWholesale = await columnExists(tableName, 'wholesalePrice');

  if (hasPartner && hasWholesale) {
    console.log('Columns already exist — nothing to do.');
    return;
  }

  if (!hasPartner) {
    await sequelize.query(
      `ALTER TABLE \`${tableName}\` ADD COLUMN partnerPrice DECIMAL(15,2) NULL AFTER sellingPrice`
    );
    console.log('Added partnerPrice');
  }

  if (!hasWholesale) {
    await sequelize.query(
      `ALTER TABLE \`${tableName}\` ADD COLUMN wholesalePrice DECIMAL(15,2) NULL AFTER partnerPrice`
    );
    console.log('Added wholesalePrice');
  }

  console.log('Migration complete.');
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => process.exit(0));
