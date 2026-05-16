const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');
const Shop = require('./src/models/Shop');

async function createUsers() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Fetch an existing shop to assign to Manager and Cashier
    let shop = await Shop.findOne();
    if (!shop) {
      console.log('No shop found, creating a default shop...');
      shop = await Shop.create({
        name: 'Default Test Shop',
        location: 'Test Location',
        is_active: true
      });
    }
    const shopId = shop.id;

    const accounts = [
      {
        email: 'ow@gmail.com',
        username: 'owner123',
        full_name: 'Super Owner',
        role: 'owner',
        password_hash: '123',
        pin_code: '1111',
        ShopId: null
      },
      {
        email: 'ad@gmail.com',
        username: 'admin123',
        full_name: 'Global Admin',
        role: 'admin',
        password_hash: '123',
        pin_code: '2222',
        ShopId: null
      },
      {
        email: 'ma@gmail.com',
        username: 'manager123',
        full_name: 'Shop Manager',
        role: 'manager',
        password_hash: '123',
        pin_code: '3333',
        ShopId: shopId
      },
      {
        email: 'ca@gmail.com',
        username: 'cashier123',
        full_name: 'Main Cashier',
        role: 'cashier',
        password_hash: '123',
        pin_code: '4444',
        ShopId: shopId
      }
    ];

    for (const acc of accounts) {
      let user = await User.findOne({ where: { email: acc.email } });
      
      if (user) {
        user.password_hash = acc.password_hash;
        user.role = acc.role;
        user.pin_code = acc.pin_code;
        user.ShopId = acc.ShopId;
        user.is_active = true;
        await user.save();
        console.log(`Updated user: ${acc.email} (${acc.role})`);
      } else {
        await User.create({
          full_name: acc.full_name,
          username: acc.username,
          email: acc.email,
          password_hash: acc.password_hash,
          role: acc.role,
          pin_code: acc.pin_code,
          ShopId: acc.ShopId,
          is_active: true
        });
        console.log(`Created user: ${acc.email} (${acc.role})`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
}

createUsers();
