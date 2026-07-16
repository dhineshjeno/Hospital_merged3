const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected!');
    console.log('Current time from DB:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.log('❌ Database connection failed!');
    console.log('Error:', error.message);
    process.exit(1);
  }
}

testConnection();