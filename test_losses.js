const { sequelize } = require('./src/config/database');
const StockMovement = require('./src/models/StockMovement');
const Stock = require('./src/models/Stock');
const Product = require('./src/models/Product');

async function test() {
  try {
    const losses = await StockMovement.findAll({
      where: { reason: 'LOSS' },
      include: [{
        model: Stock,
        where: {},
        include: [{ model: Product }]
      }],
      order: [['quantityChange', 'ASC']],
      limit: 10
    });
    console.log("Success!", losses.length);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    process.exit();
  }
}
test();
