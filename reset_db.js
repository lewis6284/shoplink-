const mysql = require('mysql2/promise');
require('dotenv').config();

const resetDB = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  });

  try {
    console.log('Resetting database...');
    await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
    await connection.query(`CREATE DATABASE ${process.env.DB_NAME}`);
    console.log('Database reset successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to reset database:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
};

resetDB();
