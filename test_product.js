const { connectDB } = require('./config/database');
const ProductService = require('./services/product.service');

async function run() {
  await connectDB();
  try {
    await ProductService.getAll({});
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit();
}
run();
