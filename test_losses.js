const { sequelize } = require('./config/database');
const StockMovement = require('./models/StockMovement');
const Stock = require('./models/Stock');
const Product = require('./models/Product');

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
