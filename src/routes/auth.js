// src/routes/auth.js
// Rebuilt from scratch — clean auth routes with no duplicate rate-limiters.
// Rate limiting is already applied globally in server.js, so we don't add it here.

const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');

// ─────────────────────────────────────────────────────────
// POST /api/v1/auth/register
// ─────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, firstName, and lastName are required',
      });
    }

    const result = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      phone: phone || null,
      role: role || 'doctor',
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result,            // { token, user }
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    const status = err.message.includes('already registered') ? 409 : 400;
    return res.status(status).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/v1/auth/login
// ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const result = await AuthService.login(email, password);

    return res.json({
      success: true,
      message: 'Login successful',
      data: result,            // { token, user }
    });
  } catch (err) {
    if (err.code === 'ACCOUNT_LOCKED') {
      // Per-ACCOUNT lockout (accountLockout service) — distinct from the
      // per-IP loginLimiter. 429 with the standard flat envelope.
      return res.status(429).json({
        success: false,
        code: 'ACCOUNT_LOCKED',
        error: err.message,
      });
    }
    console.error('Login error:', err.message);
    return res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIALS',
      error: 'Invalid email or password',
    });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/v1/auth/logout
// ─────────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logout successful' });
});

// ─────────────────────────────────────────────────────────
// Stubs for the frontend's password-reset flow
// ─────────────────────────────────────────────────────────
router.post('/forgot-password', (_req, res) => {
  res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
});

router.post('/verify-otp', (_req, res) => {
  res.json({ success: true, message: 'OTP verified' });
});

router.post('/reset-password', (_req, res) => {
  res.json({ success: true, message: 'Password reset successful' });
});

module.exports = router;