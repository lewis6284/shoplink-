const { sequelize } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');
fs.readdirSync(modelsDir)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    require(path.join(modelsDir, file));
  });

async function syncAll() {
  try {
    console.log("Altering entire database schema...");
    await sequelize.sync({ alter: true });
    console.log("Full Database sync complete.");
  } catch (error) {
    console.error("Sync error:", error);
  } finally {
    process.exit();
  }
}

syncAll();
