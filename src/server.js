/**
 * server.js — REPLACEMENT. All routes preserved; what changed and why:
 *
 *  1. validateEnv() runs FIRST: missing/placeholder secrets = refuse to boot.
 *  2. trust proxy: required behind nginx/Caddy or per-IP rate limits count the
 *     proxy as every client.
 *  3. Helmet configured for an API (HSTS on, CSP off — CSP belongs on the
 *     frontend host).
 *  4. CORS supports a comma-separated FRONTEND_URL list (dev 5173 + prod domain).
 *  5. Body limit 10mb -> 1mb (raise per-route if uploads are added later).
 *  6. MIDDLEWARE ORDER FIXED: the old code ran tenantMiddleware globally BEFORE
 *     any authentication, so req.user never existed and tenancy fell back to a
 *     default hospital. Now: /api/v1/auth is mounted first (public), then a
 *     global authenticateToken + tenantMiddleware guard protects everything
 *     else under /api/v1 (defense in depth — route-level auth still runs too).
 *  7. /health is slim in production (the old one advertised the entire internal
 *     architecture to unauthenticated callers).
 *  8. Startup banner replaced with one structured log line.
 *  9. Graceful shutdown on SIGTERM/SIGINT (drain HTTP, close pg pool).
 * 10. app is exported and listen() only runs when executed directly — this is
 *     what makes tests/security.test.js possible.
 */

require('dotenv').config();

const { validateEnv } = require('./config/validateEnv');
validateEnv(); // ← fail closed before ANY other module loads secrets

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// ── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const patientRoutes = require('./P01/patientsRoutes');
const doctorRoutes = require('./P02/doctorsRoutes');
const appointmentRoutes = require('./P03/appointmentsRoutes');
const ehrRoutes = require('./P08/ehrRoutes');
const prescriptionRoutes = require('./P09/prescriptionsRoutes');
const labRoutes = require('./P10/labRoutes');
const billingRoutes = require('./P12/billingRoutes');
const wardRoutes = require('./P13/wardRoutes');
const pharmacyRoutes = require('./P11/pharmacyRoutes');
const queueRoutes = require('./P05/queueRoutes');
// ── Middleware ──────────────────────────────────────────────────────────────
const { authenticateToken } = require('./middleware/auth');
const { tenantMiddleware } = require('./middleware/tenantMiddleware');
const {
  loginLimiter,
  registerLimiter,
  apiLimiter,
  paymentLimiter,
} = require('./middleware/rateLimit');
const auditMiddleware = require('./middleware/auditMiddleware');
const Sanitizer = require('./utils/sanitizer');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Behind nginx/Caddy in production. Without this, express-rate-limit sees the
// proxy IP as every client (one user exhausts everyone's quota; attackers
// bypass per-IP limits).
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true },
    contentSecurityPolicy: false, // JSON API — CSP is the frontend host's job
  })
);

// ── CORS: comma-separated allow-list from FRONTEND_URL ─────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Non-browser clients (curl, server-to-server, health probes) send no
      // Origin header — allow them; CORS only governs browsers anyway.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// ── Body parsing (1mb: a JSON API never needs 10mb per request) ────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ── Cross-cutting: audit + input sanitization ──────────────────────────────
app.use(auditMiddleware);
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = Sanitizer.sanitizeRequestBody(req.body);
  }
  next();
});

// ── Rate limiting ───────────────────────────────────────────────────────────
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/register', registerLimiter);
app.use('/api/v1/billing/invoices/:invoiceId/payments', paymentLimiter);
app.use('/api/v1/', apiLimiter);

// ── Health (public, intentionally minimal in production) ───────────────────
app.get('/health', (req, res) => {
  const body = { status: 'OK', uptime: Math.floor(process.uptime()) };
  if (process.env.NODE_ENV === 'development') {
    body.database = process.env.DATABASE_URL ? 'PostgreSQL' : 'not configured';
    body.env = 'development';
  }
  res.json(body);
});

// ── PUBLIC routes (no token yet) ────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patient-portal', require('./P07/patientPortalRoutes'));

// ── GLOBAL GUARD for everything else under /api/v1 ──────────────────────────
// Order matters: auth routes above already handled their requests. Any other
// /api/v1/* request must present a valid JWT, from which tenancy is derived.
// Route files that apply authenticateToken themselves still work (idempotent).
app.use('/api/v1', authenticateToken, tenantMiddleware);

// ── PROTECTED routes ────────────────────────────────────────────────────────
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/ehr', ehrRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/lab', labRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/queue', queueRoutes);
app.use('/api/v1/pharmacy', pharmacyRoutes);
app.use('/api/v1/wards', wardRoutes);
app.use('/api/v1/admissions', wardRoutes);

app.use('/api/v1/rooms', require('./P16/legacyRoomRoutes'));

// ── 404 + error handling (error handler MUST be last) ──────────────────────

// --- Missing modules routes ---
app.use('/api/v1/schedule', require('./P04/scheduleRoutes'));
app.use('/api/v1/search', require('./P06/searchRoutes'));

app.use('/api/v1/reports', require('./P14/reportsRoutes'));

app.use(notFoundHandler);
app.use(errorHandler);

// ── Start / graceful shutdown ───────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

if (require.main === module) {
  const server = app.listen(PORT, () => {
    // One structured line. Production logs are for operators, not marketing.
    console.log(
      JSON.stringify({
        service: 'hms-auth-backend',
        event: 'listening',
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        time: new Date().toISOString(),
      })
    );
  });

  const shutdown = (signal) => {
    console.log(JSON.stringify({ service: 'hms-auth-backend', event: 'shutdown', signal }));
    server.close(() => {
      try {
        // Drain the pg pool if the database module exposes it.
        // eslint-disable-next-line global-require
        const db = require('./config/database');
        if (db && db.pool && typeof db.pool.end === 'function') {
          db.pool.end().finally(() => process.exit(0));
          return;
        }
      } catch (_) {
        /* no pool to drain */
      }
      process.exit(0);
    });
    // Hard exit if connections refuse to drain within 10s.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;