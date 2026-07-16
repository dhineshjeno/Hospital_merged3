// src/middleware/rateLimit.js
// Fixed rate limiting without IPv6 keyGenerator issues

const rateLimit = require('express-rate-limit');

// Simple IP extractor that works with IPv6
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// 1. Login attempts limiter - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  // Skip when there's no email to key on, and in the test suite — the
  // per-ACCOUNT lockout (accountLockout service) is what the tests exercise;
  // an IP limiter firing mid-suite makes 429s ambiguous.
  skip: (req) => !req.body.email || process.env.NODE_ENV === 'test',
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const email = req.body.email || 'unknown';
    return `${email}-${ip}`;
  },
  // JSON handler instead of `message:` — plain-text 429s break clients that
  // expect the standard envelope on every response.
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      error: 'Too many login attempts. Please try again later.',
    });
  },
});

// 2. Registration limiter - 10 registrations per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations
  message: 'Too many registrations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    return `register-${ip}`;
  },
});

// 3. General API limiter - 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    return `api-${ip}`;
  },
});

// 4. Sensitive operations limiter - 20 requests per minute per IP
const sensitiveLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests
  message: 'Too many sensitive operations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    return `sensitive-${ip}`;
  },
});

// 5. Upload limiter - 10 uploads per hour per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads
  message: 'Too many uploads. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    return `upload-${ip}`;
  },
});

// 6. Payment limiter - 5 payment attempts per 30 minutes per IP
const paymentLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 payment attempts
  message: 'Too many payment attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    return `payment-${ip}`;
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  apiLimiter,
  sensitiveLimiter,
  uploadLimiter,
  paymentLimiter,
};