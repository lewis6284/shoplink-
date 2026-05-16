const { sequelize } = require('./src/config/database');

const dropTables = async () => {
  try {
    console.log('Dropping all tables...');
    // This will drop all tables in the database
    await sequelize.drop();
    console.log('All tables dropped successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to drop tables:', error);
    process.exit(1);
  }
};

dropTables();
