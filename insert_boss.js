require('dotenv').config();
const { sequelize } = require('./config/database');
const User = require('./models/User');

async function insertBoss() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    const email = 'boss@gmail.com';
    const username = 'boss';
    const full_name = 'Boss';
    const password = '123';

    let user = await User.findOne({ where: { email } });

    if (user) {
      // Update existing record — the beforeSave hook will re-hash the password
      user.password_hash = password;
      user.full_name = full_name;
      user.username = username;
      user.role = 'owner';
      user.is_active = true;
      user.ShopId = null;
      await user.save();
      console.log(`✅ Owner "Boss" updated  → email: ${email}`);
    } else {
      user = await User.create({
        full_name,
        username,
        email,
        password_hash: password,   // hashed by beforeSave hook
        role: 'owner',
        pin_code: '0000',
        is_active: true,
        ShopId: null
      });
      console.log(`✅ Owner "Boss" created  → email: ${email}  | id: ${user.id}`);
    }

    console.log('\n🔑 Login credentials:');
    console.log(`   Email   : ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role    : owner`);

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

insertBoss();
