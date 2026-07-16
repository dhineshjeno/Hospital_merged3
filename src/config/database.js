// src/config/database.js
// PERMANENT TLS FIX — verify-full against Aiven's CA in every environment.
//
// What was wrong before:
//   • .env had NODE_TLS_REJECT_UNAUTHORIZED=0 (removed — disabled ALL TLS
//     verification process-wide).
//   • This file then had rejectUnauthorized:false in development — the same
//     bypass, relocated into code.
//   • Meanwhile newer `pg` treats `?sslmode=require` in the URL as
//     verify-full, overriding the bypass — hence the
//     "self-signed certificate in certificate chain" failures: Node was
//     correctly refusing a chain it had no CA for.
//
// The correct fix is not another bypass; it is trusting Aiven's CA:
//   1. Download the CA from Aiven Console → your PostgreSQL service →
//      Overview → "CA certificate" → Download  (a small ca.pem file).
//   2. Save it as   certs/aiven-ca.pem   in this backend.
//      (A CA certificate is PUBLIC material — no private key inside — so it
//      is safe and convenient to commit to the repo.)
//   3. Add to .env:   PG_CA_CERT_PATH=./certs/aiven-ca.pem
//
// Behavior (fail-closed, no silent downgrades):
//   • CA file configured & present  → TLS verify-full using that CA.
//   • Host is localhost/127.0.0.1   → plain TCP (local dev database).
//   • Remote host with NO CA file   → refuse to start with instructions.
//
// Public API is unchanged: { query, getClient, pool, checkDatabaseConnection }

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const rawUrl = process.env.DATABASE_URL || '';

// Strip sslmode/ssl params from the URL so the explicit `ssl` object below is
// the single source of truth (avoids pg's URL-vs-config merge ambiguity that
// produced the confusing behavior above).
function stripSslParams(urlString) {
  try {
    const u = new URL(urlString);
    u.searchParams.delete('sslmode');
    u.searchParams.delete('ssl');
    return u.toString();
  } catch (_) {
    return urlString; // validateEnv already guarantees shape; be lenient here
  }
}

function isLocalHost(urlString) {
  try {
    const h = new URL(urlString).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
  } catch (_) {
    return false;
  }
}

function buildSslConfig() {
  // ORDER MATTERS: localhost is checked FIRST.
  // Previously the CA-file check came first, which meant that once
  // certs/aiven-ca.pem was committed (as it should be), every LOCAL database
  // connection — dev machines, the CI postgres service, test databases — was
  // forced through TLS against Aiven's CA and failed with "self-signed
  // certificate". A loopback connection never leaves the machine, so TLS
  // there protects nothing; remote connections still require verify-full.
  if (isLocalHost(rawUrl)) {
    return false; // local dev/CI database: no TLS layer
  }

  const caPath = process.env.PG_CA_CERT_PATH || './certs/aiven-ca.pem';
  const resolved = path.resolve(process.cwd(), caPath);

  if (fs.existsSync(resolved)) {
    return {
      ca: fs.readFileSync(resolved, 'utf8'),
      rejectUnauthorized: true, // verify-full: chain AND hostname
      minVersion: 'TLSv1.2',
    };
  }

  // Remote database and no CA on disk: refuse to start. Never fall back to
  // rejectUnauthorized:false — that silently accepts any certificate,
  // including a man-in-the-middle's, for a database full of medical data.
  throw new Error(
    'FATAL: remote database configured but CA certificate not found at ' +
      `"${resolved}".\n` +
      'Fix: Aiven Console → your PostgreSQL service → Overview → ' +
      '"CA certificate" → Download, save it to certs/aiven-ca.pem ' +
      '(or set PG_CA_CERT_PATH in .env to its location).\n' +
      'Do NOT work around this with rejectUnauthorized:false or ' +
      'NODE_TLS_REJECT_UNAUTHORIZED=0.'
  );
}

const pool = new Pool({
  connectionString: stripSslParams(rawUrl),
  ssl: buildSslConfig(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

async function getClient() {
  const client = await pool.connect();
  return client;
}

async function checkDatabaseConnection() {
  try {
    const result = await query(
      'SELECT NOW() as current_time, current_user, current_database()'
    );
    return { success: true, data: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { query, getClient, pool, checkDatabaseConnection };