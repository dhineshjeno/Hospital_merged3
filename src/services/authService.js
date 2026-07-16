// src/services/authService.js
// CORRECTED VERSION — what was wrong with the previous paste:
//   1. `db` was used in login() but never imported          → server crash on first login
//   2. `generateToken` was used but never imported          → crash after correct password
//   3. A stray `} catch (err) { res.status(...) }` block sat OUTSIDE the class.
//      That block belongs in routes/auth.js (services have no `res`) — see the
//      bottom of this file for exactly where it goes.
//   4. register() wrote to an in-memory mockUsers array while login() read the
//      real database — so every newly registered user could NEVER log in.
//      register() is now DB-backed like login(). mockUsers is deleted.

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');
const accountLockout = require('./accountLockout');

// Dummy hash: bcrypt.compare against this when the user doesn't exist, so the
// response time is the same for "unknown email" and "wrong password" — prevents
// user enumeration via timing.
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpqzYyGkzQO6qCFTp0lQ9dMwGxq2W';

class AuthService {
  /**
   * Register a new user (DB-backed — writes to the same table login reads).
   */
  static async register({ email, phone, password, firstName, lastName, role = 'doctor' }) {
    // Pre-check for a clean error message (the UNIQUE constraint is the real guard).
    const existing = await db.query(
      'SELECT 1 FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      const err = new Error('Email already registered');
      err.code = 'EMAIL_TAKEN';
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // TODO(multi-tenancy): once hospital onboarding exists, hospital_id must come
    // from the registration flow, not a default.
    const hospitalId =
      process.env.DEFAULT_HOSPITAL_ID || '00000000-0000-0000-0000-000000000001';

    const { rows } = await db.query(
      `INSERT INTO users
         (user_id, email, phone, password_hash, first_name, last_name, role, hospital_id, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true)
       RETURNING user_id, email, first_name, last_name, role`,
      [email.toLowerCase(), phone, passwordHash, firstName, lastName, role, hospitalId]
    );

    const u = rows[0];
    return {
      id: u.user_id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
    };
  }

  /**
   * Login with per-account lockout and timing-safe credential checking.
   */
  static async login(email, password) {
    // 1. Refuse locked accounts before touching the password.
    await accountLockout.assertNotLocked(email);

    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    const u = rows[0];

    // 2. ALWAYS run bcrypt.compare (dummy hash if no user) — keeps the response
    //    time identical for "unknown email" and "wrong password".
    const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY_HASH);

    if (!u || !ok) {
      // 3. Count the failure toward the per-account lock.
      await accountLockout.recordFailure(email);
      const err = new Error('Invalid credentials');
      err.code = 'INVALID_CREDENTIALS';
      err.statusCode = 401;
      throw err;
    }

    // 4. Success clears the counter.
    await accountLockout.reset(email);

    const token = generateToken({
      userId: u.user_id,
      email: u.email,
      hospitalId: u.hospital_id,
      role: u.role,
    });

    return {
      token,
      user: {
        id: u.user_id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role,
        hospitalId: u.hospital_id,
      },
    };
  }
}

module.exports = AuthService;

/* ────────────────────────────────────────────────────────────────────────────
 * THE CATCH BLOCK YOU PASTED DOES NOT BELONG HERE.
 * It goes in src/routes/auth.js, inside the login route handler, like this:
 *
 *   router.post('/login', async (req, res) => {
 *     try {
 *       const { email, password } = req.body;
 *       if (!email || !password) {
 *         return res.status(400).json({
 *           success: false,
 *           error: { code: 'BAD_REQUEST', message: 'Email and password are required', statusCode: 400 },
 *         });
 *       }
 *       const result = await AuthService.login(email, password);
 *       return res.json({ success: true, message: 'Login successful', data: result });
 *     } catch (err) {
 *       if (err.code === 'ACCOUNT_LOCKED') {
 *         return res.status(429).json({
 *           success: false,
 *           error: { code: 'ACCOUNT_LOCKED', message: err.message, statusCode: 429 },
 *         });
 *       }
 *       return res.status(401).json({
 *         success: false,
 *         error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials', statusCode: 401 },
 *       });
 *     }
 *   });
 *
 * And the register route should map EMAIL_TAKEN to 409:
 *
 *   } catch (err) {
 *     if (err.code === 'EMAIL_TAKEN') {
 *       return res.status(409).json({
 *         success: false,
 *         error: { code: 'EMAIL_TAKEN', message: err.message, statusCode: 409 },
 *       });
 *     }
 *     return res.status(400).json({
 *       success: false,
 *       error: { code: 'REGISTRATION_FAILED', message: 'Registration failed', statusCode: 400 },
 *     });
 *   }
 * ──────────────────────────────────────────────────────────────────────────── */