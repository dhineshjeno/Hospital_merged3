-- 010_login_attempts.sql
-- Per-account login throttling (see src/services/accountLockout.js).
-- Run against the Aiven database once:
--   psql "$DATABASE_URL" -f migrations/010_login_attempts.sql

CREATE TABLE IF NOT EXISTS login_attempts (
    email        varchar(255) PRIMARY KEY,
    failed_count integer      NOT NULL DEFAULT 0,
    locked_until timestamptz,
    updated_at   timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE login_attempts IS
  'Per-account failed login tracking. Locks account after MAX_LOGIN_ATTEMPTS for LOGIN_WINDOW_MS. Rows are deleted on successful login.';

-- Housekeeping index for periodic cleanup jobs (optional):
CREATE INDEX IF NOT EXISTS idx_login_attempts_updated_at
  ON login_attempts (updated_at);

-- ─────────────────────────────────────────────────────────────────────────
-- AUDIT LOG HARDENING (run in the same migration window)
-- Make audit_logs append-only from the application's DB role: the app can
-- INSERT evidence but can never rewrite history. Replace <app_role> with the
-- role your DATABASE_URL connects as (Aiven default: avnadmin — ideally create
-- a dedicated lower-privilege role for the app and use that here).
-- ─────────────────────────────────────────────────────────────────────────
-- REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM <app_role>;
-- GRANT  INSERT, SELECT              ON audit_logs TO   <app_role>;
