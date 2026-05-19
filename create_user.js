const { sequelize } = require('./config/database');
const User = require('./models/User');
require('dotenv').config();

const email    = process.env.EMAIL_ADRESS;
const password = process.env.PASSWORD;
const role     = process.env.ROLE;
const fullName = process.env.FULL_NAME;
const username = process.env.USERNAME;
const pinCode  = process.env.PIN_CODE;

// --- Validate required env vars before doing anything ---
const missing = ['EMAIL_ADRESS', 'PASSWORD', 'ROLE', 'FULL_NAME', 'USERNAME', 'PIN_CODE']
  .filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Set them in your .env file and try again.');
  process.exit(1);
}

if (role !== 'owner') {
  console.error(`❌ ROLE must be "owner". Got: "${role}"`);
  console.error('   This script only creates the initial owner account.');
  process.exit(1);
}

async function createOwner() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    let user = await User.findOne({ where: { email } });

    if (user) {
      user.password_hash = password;
      user.role          = role;
      user.pin_code      = pinCode;
      user.full_name     = fullName;
      user.username      = username;
      user.ShopId        = null;
      user.is_active     = true;
      await user.save();
      console.log(`✅ Owner account updated: ${email}`);
    } else {
      await User.create({
        full_name:     fullName,
        username:      username,
        email:         email,
        password_hash: password,
        role:          role,
        pin_code:      pinCode,
        ShopId:        null,
        is_active:     true
      });
      console.log(`✅ Owner account created: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating owner:', error.message);
    process.exit(1);
  }
}

createOwner();
