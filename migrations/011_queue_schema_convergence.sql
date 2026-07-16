-- migrations/011_queue_schema_convergence.sql
--
-- WHY THIS EXISTS
-- Two incompatible queue_entries tables were designed independently:
--   Person 2 (this repo): has hospital_id, but no queue_date/patient_id/priority
--   Person 3 (hosdb):     richer + correct, but no hospital_id
-- Person 3's queue business logic is being ported in, and it reads SIX columns
-- this table does not have. This migration converges to the better shape while
-- KEEPING the tenancy this repo already had.
--
-- IT ALSO FIXES A PROVEN BUG.
--   UNIQUE(hospital_id, doctor_id, queue_number) has no date component, so a
--   queue number is unique per doctor FOREVER. Verified against a live table:
--   inserting queue #1 for a doctor on day 2 fails with
--     "Key (hospital_id, doctor_id, queue_number)=(...,1) already exists"
--   i.e. the clinic can never check in a first patient again. queue_date makes
--   the constraint per-day, which is what a real queue needs.
--
-- Run:  node scripts/run-sql.js migrations/011_queue_schema_convergence.sql
-- Safe to re-run.

BEGIN;

-- ── 1. Columns Person 3's ported code requires ───────────────────────────

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS patient_id  uuid,
  ADD COLUMN IF NOT EXISTS queue_date  date     NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS priority    smallint NOT NULL DEFAULT 0;

-- Backfill patient_id from the linked appointment, then enforce NOT NULL.
UPDATE queue_entries q
SET    patient_id = a.patient_id
FROM   appointments a
WHERE  q.appointment_id = a.appointment_id
  AND  q.patient_id IS NULL;

DELETE FROM queue_entries WHERE patient_id IS NULL;  -- orphans (dummy data only)

ALTER TABLE queue_entries ALTER COLUMN patient_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_queue_entries_patient') THEN
    ALTER TABLE queue_entries
      ADD CONSTRAINT fk_queue_entries_patient
      FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 2. Walk-ins: a queue entry must not require an appointment ───────────
-- Person 3's model allows appointment_id NULL (patient walks in without one).
-- This repo had it NOT NULL, which makes walk-ins impossible.
ALTER TABLE queue_entries ALTER COLUMN appointment_id DROP NOT NULL;

-- ── 3. Time columns → Person 3's names (their ported code reads these) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='queue_entries' AND column_name='arrival_time') THEN
    ALTER TABLE queue_entries RENAME COLUMN arrival_time TO checked_in_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='queue_entries' AND column_name='called_time') THEN
    ALTER TABLE queue_entries RENAME COLUMN called_time TO called_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='queue_entries' AND column_name='completed_time') THEN
    ALTER TABLE queue_entries RENAME COLUMN completed_time TO completed_at;
  END IF;
END $$;

-- ── 4. THE BUG FIX: queue numbers are unique PER DAY, not forever ────────
ALTER TABLE queue_entries DROP CONSTRAINT IF EXISTS queue_entries_hospital_id_doctor_id_queue_number_key;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'uq_queue_entries_hospital_doctor_date_number') THEN
    ALTER TABLE queue_entries
      ADD CONSTRAINT uq_queue_entries_hospital_doctor_date_number
      UNIQUE (hospital_id, doctor_id, queue_date, queue_number);
  END IF;
END $$;

-- One appointment cannot be queued twice.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_queue_entries_appointment') THEN
    ALTER TABLE queue_entries
      ADD CONSTRAINT uq_queue_entries_appointment UNIQUE (appointment_id);
  END IF;
END $$;

-- ── 5. Status vocabulary ────────────────────────────────────────────────
-- TEAM DECISION, made explicit: Person 3's ported code writes lowercase
-- ('waiting','called','in_progress','completed','cancelled','missed');
-- this repo's CHECK demanded Title case ('Waiting','Called',...). The ported
-- code is the one being kept, so the constraint follows it. Existing rows are
-- normalised. If the team prefers Title case instead, change the ported code
-- — but pick ONE and apply it everywhere (the patients.gender split is the
-- same disease).
ALTER TABLE queue_entries DROP CONSTRAINT IF EXISTS queue_entries_status_check;

UPDATE queue_entries SET status = lower(replace(status, '-', '_'));

ALTER TABLE queue_entries ALTER COLUMN status SET DEFAULT 'waiting';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_queue_entries_status') THEN
    ALTER TABLE queue_entries
      ADD CONSTRAINT ck_queue_entries_status
      CHECK (status IN ('waiting','called','in_progress','completed','cancelled','missed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_queue_entries_number') THEN
    ALTER TABLE queue_entries ADD CONSTRAINT ck_queue_entries_number CHECK (queue_number > 0);
  END IF;
END $$;

-- ── 6. Indexes for the hot query (hospital + doctor + date) ──────────────
CREATE INDEX IF NOT EXISTS idx_queue_entries_hospital_doctor_date
  ON queue_entries (hospital_id, doctor_id, queue_date);
CREATE INDEX IF NOT EXISTS idx_queue_entries_hospital_id
  ON queue_entries (hospital_id);

COMMIT;

-- ── VERIFY ──────────────────────────────────────────────────────────────
-- \d queue_entries
-- Expect: hospital_id, patient_id, queue_date, priority, checked_in_at,
--         called_at, completed_at, appointment_id (nullable), and
--         UNIQUE (hospital_id, doctor_id, queue_date, queue_number)

-- ── PHARMACY: NOT INCLUDED, ON PURPOSE ──────────────────────────────────
-- medicines also exists in both schemas and they disagree:
--   this repo: hospital_id + UNIQUE(hospital_id, name, strength)
--   hosdb:     medicine_code, unit_price, reorder_level,
--              UNIQUE(medicine_code)  ← globally unique = cross-tenant collision
-- Person 3's pharmacy code needs medicine_code/unit_price/reorder_level, and
-- medicine_batches + pharmacy_stock_transactions don't exist here at all.
-- That convergence is a bigger decision than queue and should be its own
-- migration (012), written after the queue port proves the pattern. When it is
-- written: medicine_code must be UNIQUE (hospital_id, medicine_code) — global
-- uniqueness lets one hospital's formulary block another's, and leaks the
-- existence of other tenants' rows through duplicate-key errors.