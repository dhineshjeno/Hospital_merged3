const { pool } = require('./config/database');

async function test() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected!', result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

test();