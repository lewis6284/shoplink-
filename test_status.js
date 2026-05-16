require('dotenv').config();
const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');

async function testStatus() {
  await sequelize.authenticate();
  const userId = 'u0000000-0000-0000-0000-000000000003'; // Cashier User
  const user = await User.findByPk(userId);
  
  console.log(`Initial status: ${user.is_active}`);
  
  user.is_active = !user.is_active;
  await user.save();
  
  const updatedUser = await User.findByPk(userId);
  console.log(`Updated status: ${updatedUser.is_active}`);
  
  // Revert
  updatedUser.is_active = !updatedUser.is_active;
  await updatedUser.save();
  console.log(`Reverted status: ${updatedUser.is_active}`);
  
  process.exit(0);
}

testStatus().catch(e => { console.error(e); process.exit(1); });
