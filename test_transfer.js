const { connectDB } = require('./config/database');
const TransferService = require('./services/stock.transfer.service');

async function run() {
  await connectDB();
  try {
    await TransferService.getAll({});
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit();
}
run();
