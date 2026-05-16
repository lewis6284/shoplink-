const { sequelize } = require('./src/config/database');

async function check() {
  const [results] = await sequelize.query("DESCRIBE Expenses");
  console.log(JSON.stringify(results, null, 2));
  process.exit();
}

check();
