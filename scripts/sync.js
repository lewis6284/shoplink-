const { sequelize } = require('../config/database');
// Import all models and associations through the db index to apply prefixes and relationships
require('../db');


const syncDB = async () => {
  try {
    console.log('Syncing database...');
    // Recreate all tables cleanly with correct prefixes and paranoid deletedAt support
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Database synced successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to sync database:', error);
    process.exit(1);
  }
};

syncDB();
