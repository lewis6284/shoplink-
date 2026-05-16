require('dotenv').config();
const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');

const accounts = [
  { email: 'boss@gmail.com',          password: 'boss123',      is_active: true  },
  { email: 'cristophe@gmail.com',     password: 'manager123',   is_active: true  },
  { email: 'tefatog@mailinator.com',  password: 'manager123',   is_active: true  },
  { email: 'ma@gmail.com',            password: 'manager123',   is_active: true  },
  { email: 'sh@gmail.com',            password: 'cashier123',   is_active: true  },
];

async function resetAll() {
  await sequelize.authenticate();
  console.log('✅ Connected\n');

  for (const acc of accounts) {
    const user = await User.findOne({ where: { email: acc.email } });
    if (!user) { console.log(`⚠️  Not found: ${acc.email}`); continue; }

    user.password_hash = acc.password;  // beforeSave hook will hash it
    user.is_active = acc.is_active;
    await user.save();
    console.log(`✅ Reset: ${acc.email}  →  password: ${acc.password}`);
  }

  console.log('\nDone.');
  await sequelize.close();
  process.exit(0);
}

resetAll().catch(e => { console.error(e.message); process.exit(1); });
