/**
 * scripts/run-sql.js — execute a .sql file against the database through the
 * app's own verified-TLS pool (no psql installation needed on Windows).
 *
 * Usage (from hospital-management-system/):
 *   node scripts/run-sql.js migrations/010_login_attempts.sql
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: node scripts/run-sql.js <path-to-sql-file>');
    process.exit(1);
  }

  const sqlPath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  // Reuse the app's pool: same DATABASE_URL, same Aiven CA verification.
  const { pool } = require('../src/config/database');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`Running ${fileArg} ...`);
  try {
    await pool.query(sql); // pg executes multi-statement files in one call
    console.log('✓ Migration applied successfully.');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();