const { User, Shop, ShopFinancial, GlobalStock, Stock, Product, Sale, SaleItem, Expense, Category, Brand, AuditLog } = require('./db');
const { v4: uuidv4 } = require('uuid');

const seed = async () => {
  try {
    console.log('🌱 Starting Serious Seeding...');

    // 0. Cleanup existing data for a fresh start
    console.log('🧹 Cleaning up old data...');
    // await SaleItem.destroy({ where: {}, truncate: false });
    // await Sale.destroy({ where: {}, truncate: false });
    // await Expense.destroy({ where: {}, truncate: false });
    // await Stock.destroy({ where: {}, truncate: false });
    // await AuditLog.destroy({ where: {}, truncate: false });
    // await Product.destroy({ where: {}, truncate: false });
    // await Category.destroy({ where: {}, truncate: false });
    // await Brand.destroy({ where: {}, truncate: false });
    console.log('✅ Cleanup finished');

    // 1. Create Shops
    const shopsData = [
      { id: '00000000-0000-0000-0000-000000000001', name: 'ShopLink HQ', type: 'RETAIL', status: 'active', address: '123 Tech Avenue', email: 'hq@shoplink.com', phone: '+257 70000001' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Downtown Retail', type: 'RETAIL', status: 'active', address: '45 Market St', email: 'downtown@shoplink.com', phone: '+257 70000002' },
      { id: '00000000-0000-0000-0000-000000000003', name: 'Main Warehouse', type: 'WAREHOUSE', status: 'active', address: 'Industrial Zone', email: 'wh@shoplink.com', phone: '+257 70000003' }
    ];

    for (const s of shopsData) {
      await Shop.findOrCreate({ where: { id: s.id }, defaults: s });
    }
    console.log('✅ Shops Created');

    // 2. Create Users
    const users = [
      { id: 'u0000000-0000-0000-0000-000000000001', full_name: 'Boss Owner', username: 'boss', email: 'boss@gmail.com', password_hash: '123', role: 'owner', is_active: 1 },
      { id: 'u0000000-0000-0000-0000-000000000002', full_name: 'Downtown Manager', username: 'manager', email: 'manager@gmail.com', password_hash: '123', role: 'manager', ShopId: shopsData[1].id, is_active: 1 },
      { id: 'u0000000-0000-0000-0000-000000000003', full_name: 'Expert Cashier', username: 'cashier', email: 'cashier@gmail.com', password_hash: '123', role: 'cashier', ShopId: shopsData[1].id, is_active: 1 }
    ];

    for (const userData of users) {
      const [user] = await User.findOrCreate({ where: { email: userData.email }, defaults: userData });
      user.password_hash = userData.password_hash;
      await user.save();
    }
    console.log('✅ Users Created');
    
        // 3. Create Categories & Brands
        const categories = ['Electronics', 'Beverages', 'Food', 'Clothing'];
        const brands = ['Sony', 'Coca-Cola', 'Nestle', 'Nike'];
    
        const catMap = {};
        const brandMap = {};
    
        for (const name of categories) {
          const [c] = await Category.findOrCreate({ where: { name }, defaults: { id: uuidv4() } });
          catMap[name] = c.id;
        }
        for (const name of brands) {
          const [b] = await Brand.findOrCreate({ where: { name }, defaults: { id: uuidv4() } });
          brandMap[name] = b.id;
        }
        console.log('✅ Categories & Brands Created');
    
        // 4. Create Products & Stocks
        const productsData = [
          { product_code: 'PROD-001', name: 'Smartphone X', purchasePrice: 500000, sellingPrice: 750000, barcode: '88001122', CategoryId: catMap['Electronics'], BrandId: brandMap['Sony'] },
          { product_code: 'PROD-002', name: 'Cold Soda 500ml', purchasePrice: 1200, sellingPrice: 1500, barcode: '11223344', CategoryId: catMap['Beverages'], BrandId: brandMap['Coca-Cola'] },
          { product_code: 'PROD-003', name: 'Instant Coffee', purchasePrice: 8000, sellingPrice: 12000, barcode: '55667788', CategoryId: catMap['Food'], BrandId: brandMap['Nestle'] },
          { product_code: 'PROD-004', name: 'Running Shoes', purchasePrice: 45000, sellingPrice: 85000, barcode: '99001122', CategoryId: catMap['Clothing'], BrandId: brandMap['Nike'] },
          { product_code: 'PROD-005', name: 'Bluetooth Speaker', purchasePrice: 120000, sellingPrice: 180000, barcode: '44556677', CategoryId: catMap['Electronics'], BrandId: brandMap['Sony'] }
        ];
    
        const createdProducts = [];
        for (const p of productsData) {
          const [prod] = await Product.findOrCreate({ where: { barcode: p.barcode }, defaults: { ...p, id: uuidv4() } });
          createdProducts.push(prod);
    
          // Add Stock for each shop
          for (const s of shopsData) {
            await Stock.create({
              id: uuidv4(),
              ProductId: prod.id,
              ShopId: s.id,
              quantity: Math.floor(Math.random() * 50) + 5
            });
          }
        }
        console.log('✅ Products & Stocks Created');
    
        // 5. Create Historical Sales (Last 7 days)
        console.log('⏳ Generating Sales Data...');
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
    
          for (const s of shopsData) {
            if (s.type === 'WAREHOUSE') continue;
    
            // Create 3-8 sales per day per shop
            const salesCount = Math.floor(Math.random() * 6) + 3;
            for (let j = 0; j < salesCount; j++) {
              const saleId = uuidv4();
              const p1 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
              const qty = Math.floor(Math.random() * 3) + 1;
              const total = parseFloat(p1.sellingPrice) * qty;
    
              const sale = await Sale.create({
                id: saleId,
                ShopId: s.id,
                UserId: users[2].id, // Cashier
                status: 'COMPLETED',
                paymentMethod: Math.random() > 0.3 ? 'CASH' : 'MOBILE_MONEY',
                subtotal: total,
                total_amount: total,
                createdAt: date,
                updatedAt: date
              });
    
              await SaleItem.create({
                id: uuidv4(),
                SaleId: saleId,
                ProductId: p1.id,
                quantity: qty,
                unitPrice: p1.sellingPrice,
                subTotal: total,
                unitCostSnapshot: p1.purchasePrice,
                createdAt: date
              });
            }
    
            // Add 1-2 expenses per day
            await Expense.create({
              id: uuidv4(),
              ShopId: s.id,
              description: i % 2 === 0 ? 'Electricity bill' : 'Transport',
              amount: Math.floor(Math.random() * 50000) + 5000,
              date: date
            });
          }
        }
        console.log('✅ Sales & Expenses Generated');
        

    console.log('🚀 Serious Seeding Completed!');
    process.exit(0);
  } catch (error) {
    console.error('🔥 Seeding Failed:', error);
    process.exit(1);
  }
};

seed();
