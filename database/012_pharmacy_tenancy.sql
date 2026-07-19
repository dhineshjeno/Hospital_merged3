BEGIN;

-- Add hospital_id to child pharmacy tables that were missed in 006
ALTER TABLE medicine_batches ADD COLUMN hospital_id uuid;
ALTER TABLE pharmacy_stock_transactions ADD COLUMN hospital_id uuid;

CREATE INDEX idx_medicine_batches_hospital_id ON medicine_batches (hospital_id);
CREATE INDEX idx_pharmacy_stock_transactions_hospital_id ON pharmacy_stock_transactions (hospital_id);

COMMENT ON COLUMN medicine_batches.hospital_id IS
    'Placeholder for multi-tenancy. Added in 012 migration.';
COMMENT ON COLUMN pharmacy_stock_transactions.hospital_id IS
    'Placeholder for multi-tenancy. Added in 012 migration.';

COMMIT;
