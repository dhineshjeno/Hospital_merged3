/**
 * validateEnv.js — fail-closed environment validation.
 *
 * Called FIRST in server.js, before anything else loads. If any secret is
 * missing, malformed, or still a placeholder, the process refuses to start.
 * Security config must fail closed: a server that boots with a broken key
 * silently destroys encrypted patient data (see encryption.js).
 */

const RULES = {
  DATABASE_URL: {
    check: (v) => /^postgres(ql)?:\/\//.test(v),
    hint: 'must be a postgres:// connection string',
  },
  JWT_SECRET: {
    check: (v) =>
      v.length >= 32 &&
      !/change.this|your.secret|your_super|example|placeholder/i.test(v),
    hint:
      'must be >= 32 chars and not a placeholder. Generate: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
  },
  ENCRYPTION_KEY: {
    check: (v) => /^[0-9a-f]{64}$/i.test(v) && !/^0123456789abcdef/.test(v),
    hint:
      'must be 64 random hex chars (not the 0123... example). Generate: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  },
  FRONTEND_URL: {
    check: (v) => /^https?:\/\//.test(v),
    hint: 'must be the frontend origin, e.g. http://localhost:5173 (comma-separate multiple)',
  },
};

function validateEnv() {
  const failures = [];

  for (const [key, rule] of Object.entries(RULES)) {
    const value = process.env[key];
    if (!value) {
      failures.push(`${key} is missing (${rule.hint})`);
    } else if (!rule.check(value)) {
      failures.push(`${key} is invalid: ${rule.hint}`);
    }
  }

  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    failures.push(
      'NODE_TLS_REJECT_UNAUTHORIZED=0 is set. This disables ALL TLS certificate ' +
        'verification and must never be used. For Aiven, download the CA cert ' +
        'and configure the pg Pool with ssl: { ca }.'
    );
  }

  if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL?.includes('localhost')) {
    failures.push('FRONTEND_URL points at localhost while NODE_ENV=production');
  }

  if (failures.length > 0) {
    /* eslint-disable no-console */
    console.error('\nFATAL — refusing to start, environment is invalid:\n');
    failures.forEach((f) => console.error(`  ✗ ${f}`));
    console.error('\nFix .env (see .env.example) and restart.\n');
    process.exit(1);
  }
}

module.exports = { validateEnv };
