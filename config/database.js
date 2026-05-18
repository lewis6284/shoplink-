const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false, // Matches the user's SQL schema (e.g. CategoryId, createdAt)
      paranoid: true
    }
  }
);

// --- ⚙️ GLOBAL HOOK TO AUTOMATICALLY PREFIX EVERY TABLE NAME ---
sequelize.addHook('afterDefine', (model) => {
  const PREFIX = 'shop_pwa_';
  if (model.tableName && !model.tableName.startsWith(PREFIX)) {
    model.tableName = `${PREFIX}${model.tableName.toLowerCase()}`;
  }
  if (model.options && model.options.tableName && !model.options.tableName.startsWith(PREFIX)) {
    model.options.tableName = `${PREFIX}${model.options.tableName.toLowerCase()}`;
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
