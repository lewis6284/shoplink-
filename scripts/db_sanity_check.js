const { sequelize } = require('../config/database');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Stock = require('../models/Stock');
const Product = require('../models/Product');

async function run(startDate, endDate, shopId = null) {
  const start = `${startDate} 00:00:00`;
  const end = `${endDate} 23:59:59`;
  const { Op, fn, col, literal } = require('sequelize');

  const whereSale = { status: 'COMPLETED', createdAt: { [Op.between]: [start, end] } };
  if (shopId) whereSale.ShopId = shopId;

  console.log(`Running DB sanity checks for period: ${startDate} -> ${endDate}` + (shopId ? ` (shop ${shopId})` : ''));

  const soldRows = await SaleItem.findAll({
    attributes: [
      'ProductId',
      [fn('SUM', col('SaleItem.quantity')), 'qty_sold'],
      [fn('SUM', col('SaleItem.subTotal')), 'total_revenue'],
      [literal('SUM(SaleItem.quantity * SaleItem.unitCostSnapshot)'), 'total_cost'],
      [literal('SUM((SaleItem.unitPrice - SaleItem.unitCostSnapshot) * SaleItem.quantity)'), 'gross_profit']
    ],
    include: [{ model: require('../models/Sale'), attributes: [], where: whereSale }],
    group: ['ProductId'],
    raw: true
  });

  const stockRows = await Stock.findAll({ where: shopId ? { ShopId: shopId } : {}, attributes: ['ProductId', 'quantity'], raw: true });
  const stockByProduct = new Map(stockRows.map(s => [s.ProductId, Number(s.quantity)]));

  const productIds = [...new Set(soldRows.map(r => r.ProductId).concat(stockRows.map(s => s.ProductId)))];
  const products = await Product.findAll({ where: { id: productIds }, attributes: ['id', 'name'], raw: true });
  const nameById = new Map(products.map(p => [p.id, p.name]));

  let grand = { total_revenue: 0, total_cost: 0, gross_profit: 0 };
  console.log('\nProduct | Sold | Remaining | Entered | Total Sales | Total Cost | Gross Profit');
  for (const r of soldRows) {
    const pid = r.ProductId;
    const sold = Number(r.qty_sold || 0);
    const remaining = Number(stockByProduct.get(pid) || 0);
    const entered = sold + remaining;
    const revenue = Number(r.total_revenue || 0);
    const cost = Number(r.total_cost || 0);
    const profit = Number(r.gross_profit || (revenue - cost));

    grand.total_revenue += revenue;
    grand.total_cost += cost;
    grand.gross_profit += profit;

    console.log(`${nameById.get(pid) || pid} | ${sold} | ${remaining} | ${entered} | ${revenue.toLocaleString()} | ${cost.toLocaleString()} | ${profit.toLocaleString()}`);
  }

  console.log('\nGrand totals from aggregates:');
  console.log(`Total Sales: ${grand.total_revenue.toLocaleString()}`);
  console.log(`Total Cost:  ${grand.total_cost.toLocaleString()}`);
  console.log(`Gross Profit: ${grand.gross_profit.toLocaleString()}`);

  await sequelize.close();
}

const argv = process.argv.slice(2);
const startArg = argv[0] || '2026-05-15';
const endArg = argv[1] || '2026-06-14';
const shopIdArg = argv[2] || null;

run(startArg, endArg, shopIdArg).catch(err => {
  console.error('Error running DB sanity checks:', err);
  process.exit(1);
});
