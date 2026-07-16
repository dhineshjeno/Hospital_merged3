/**
 * accountLockout.js — per-ACCOUNT login throttling.
 *
 * Why this exists in addition to loginLimiter (rate limit): the rate limiter is
 * per-IP. An attacker rotating IPs (botnet, cloud functions) can hammer ONE
 * account indefinitely. This module locks the ACCOUNT after N failures,
 * regardless of source IP.
 *
 * Requires migration: migrations/010_login_attempts.sql
 * Config (already in your .env):
 *   MAX_LOGIN_ATTEMPTS  (default 5)
 *   LOGIN_WINDOW_MS     (default 900000 = 15 min; used as the lock duration)
 *
 * Fail-open on infrastructure errors is deliberate for AVAILABILITY of a
 * hospital system (a DB blip must not lock every clinician out), but every
 * such failure is loudly logged for the audit trail.
 */

const { query } = require('../config/database');

const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCK_MS = parseInt(process.env.LOGIN_WINDOW_MS || '900000', 10);

/**
 * Throws (generic message — never reveal lock state precisely enough to help
 * an attacker calibrate) if the account is currently locked.
 */
async function assertNotLocked(email) {
  try {
    const { rows } = await query(
      'SELECT failed_count, locked_until FROM login_attempts WHERE email = $1',
      [email.toLowerCase()]
    );
    const row = rows[0];
    if (row && row.locked_until && new Date(row.locked_until) > new Date()) {
      const err = new Error('Too many failed attempts. Try again later.');
      err.code = 'ACCOUNT_LOCKED';
      err.statusCode = 429;
      throw err;
    }
  } catch (err) {
    if (err.code === 'ACCOUNT_LOCKED') throw err;
    console.error('[lockout] check failed (failing open):', err.message);
  }
}

/**
 * Record a failed attempt; lock the account when the threshold is reached.
 */
async function recordFailure(email) {
  try {
    await query(
      `INSERT INTO login_attempts (email, failed_count, locked_until, updated_at)
       VALUES ($1, 1, NULL, now())
       ON CONFLICT (email) DO UPDATE SET
         failed_count = CASE
           WHEN login_attempts.locked_until IS NOT NULL
                AND login_attempts.locked_until <= now()
             THEN 1                                   -- lock expired: fresh count
           ELSE login_attempts.failed_count + 1
         END,
         locked_until = CASE
           WHEN (CASE
                   WHEN login_attempts.locked_until IS NOT NULL
                        AND login_attempts.locked_until <= now() THEN 1
                   ELSE login_attempts.failed_count + 1
                 END) >= $2
             THEN now() + ($3 || ' milliseconds')::interval
           ELSE NULL
         END,
         updated_at = now()`,
      [email.toLowerCase(), MAX_ATTEMPTS, String(LOCK_MS)]
    );
  } catch (err) {
    console.error('[lockout] recordFailure failed:', err.message);
  }
}

/**
 * Clear attempts after a successful login.
 */
async function reset(email) {
  try {
    await query('DELETE FROM login_attempts WHERE email = $1', [email.toLowerCase()]);
  } catch (err) {
    console.error('[lockout] reset failed:', err.message);
  }
}

module.exports = { assertNotLocked, recordFailure, reset, MAX_ATTEMPTS, LOCK_MS };
