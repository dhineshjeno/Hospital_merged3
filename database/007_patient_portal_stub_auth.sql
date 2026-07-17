BEGIN;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_pin_hash varchar(100);
COMMENT ON COLUMN patients.patient_pin_hash IS
    'bcrypt hash of a 6-digit patient portal PIN. Stub auth pending Person 2 full auth integration.';
COMMIT;
