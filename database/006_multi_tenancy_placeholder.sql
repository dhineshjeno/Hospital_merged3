BEGIN;

-- Phase 8: Multi-tenancy placeholder columns.
--
-- DECISION (made without Person 2's confirmation, see README note below):
--   Column name: hospital_id
--   Column type: uuid
-- Chosen to match this project's plan doc wording ("hospital_id in every
-- query") and to stay consistent with every other PK/FK in this schema,
-- which are all uuid. If Person 2's actual hospitals table uses a
-- different primary key name or type, this migration's column name/type
-- and the FK added in a later migration will need to be corrected --
-- treat this as a best-effort placeholder, not a confirmed contract.
--
-- hospital_id is added only to tables that are top-level entities with no
-- hospital-scoped parent to inherit from. Child tables (appointments,
-- consultations, invoices, admissions, lab_orders, medicine_batches, etc.)
-- intentionally do NOT get their own hospital_id column -- they derive
-- hospital scope through their parent FK (patient_id, doctor_id, ward_id,
-- medicine_id). Duplicating hospital_id onto every child table would let a
-- child row's hospital_id silently disagree with its parent's, which is a
-- real bug class worth avoiding even before Person 2's table exists.
--
-- No foreign key to a hospitals table is added here, because that table
-- does not exist yet in this codebase. A follow-up migration should run:
--   ALTER TABLE patients ADD CONSTRAINT fk_patients_hospital
--     FOREIGN KEY (hospital_id) REFERENCES hospitals (hospital_id);
-- (repeated for each table below) once Person 2's hospitals table lands,
-- at which point hospital_id should also be backfilled and switched from
-- nullable to NOT NULL.

ALTER TABLE patients ADD COLUMN hospital_id uuid;
ALTER TABLE doctors ADD COLUMN hospital_id uuid;
ALTER TABLE wards ADD COLUMN hospital_id uuid;
ALTER TABLE departments ADD COLUMN hospital_id uuid;
ALTER TABLE lab_test_catalog ADD COLUMN hospital_id uuid;
ALTER TABLE medicines ADD COLUMN hospital_id uuid;
ALTER TABLE insurance_providers ADD COLUMN hospital_id uuid;

CREATE INDEX idx_patients_hospital_id ON patients (hospital_id);
CREATE INDEX idx_doctors_hospital_id ON doctors (hospital_id);
CREATE INDEX idx_wards_hospital_id ON wards (hospital_id);
CREATE INDEX idx_departments_hospital_id ON departments (hospital_id);
CREATE INDEX idx_lab_test_catalog_hospital_id ON lab_test_catalog (hospital_id);
CREATE INDEX idx_medicines_hospital_id ON medicines (hospital_id);
CREATE INDEX idx_insurance_providers_hospital_id ON insurance_providers (hospital_id);

COMMENT ON COLUMN patients.hospital_id IS
    'Placeholder for multi-tenancy. Not yet FK-constrained to a hospitals table (pending Person 2). Nullable until backfilled.';
COMMENT ON COLUMN doctors.hospital_id IS
    'Placeholder for multi-tenancy. Not yet FK-constrained to a hospitals table (pending Person 2). Nullable until backfilled.';
COMMENT ON COLUMN wards.hospital_id IS
    'Placeholder for multi-tenancy. Not yet FK-constrained to a hospitals table (pending Person 2). Nullable until backfilled.';
COMMENT ON COLUMN departments.hospital_id IS
    'Placeholder for multi-tenancy. Not yet FK-constrained to a hospitals table (pending Person 2). Nullable until backfilled.';
COMMENT ON COLUMN lab_test_catalog.hospital_id IS
    'Placeholder for multi-tenancy. Not yet FK-constrained to a hospitals table (pending Person 2). Nullable until backfilled.';
COMMENT ON COLUMN medicines.hospital_id IS
    'Placeholder for multi-tenancy. Not yet FK-constrained to a hospitals table (pending Person 2). Nullable until backfilled.';
COMMENT ON COLUMN insurance_providers.hospital_id IS
    'Placeholder for multi-tenancy. Not yet FK-constrained to a hospitals table (pending Person 2). Nullable until backfilled.';

COMMIT;
