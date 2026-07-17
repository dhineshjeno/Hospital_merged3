BEGIN;

-- Phase 6: Pharmacy catalog, batch-level stock, and stock transaction ledger.
-- Depends on: prescription_items (001), invoices/invoice_items (001).

CREATE TABLE medicines (
    medicine_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_code varchar(30) NOT NULL,
    medicine_name varchar(255) NOT NULL,
    generic_name varchar(255),
    category varchar(80) NOT NULL,
    manufacturer varchar(150),
    dosage_form varchar(40) NOT NULL,
    strength varchar(80),
    unit_of_measure varchar(20) NOT NULL,
    unit_price numeric(12, 2) NOT NULL DEFAULT 0,
    reorder_level integer NOT NULL DEFAULT 0,
    requires_prescription boolean NOT NULL DEFAULT true,
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_medicines_code UNIQUE (medicine_code),
    CONSTRAINT ck_medicines_dosage_form CHECK (
        dosage_form IN ('tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'other')
    ),
    CONSTRAINT ck_medicines_unit_price CHECK (unit_price >= 0),
    CONSTRAINT ck_medicines_reorder_level CHECK (reorder_level >= 0),
    CONSTRAINT ck_medicines_status CHECK (status IN ('active', 'discontinued'))
);

CREATE TABLE medicine_batches (
    medicine_batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id uuid NOT NULL,
    batch_number varchar(60) NOT NULL,
    purchase_price numeric(12, 2) NOT NULL,
    selling_price numeric(12, 2) NOT NULL,
    quantity_received integer NOT NULL,
    quantity_on_hand integer NOT NULL,
    manufactured_date date,
    expiry_date date NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_medicine_batches_medicine FOREIGN KEY (medicine_id)
        REFERENCES medicines (medicine_id) ON DELETE RESTRICT,
    CONSTRAINT uq_medicine_batches_medicine_batch UNIQUE (medicine_id, batch_number),
    CONSTRAINT uq_medicine_batches_id_medicine UNIQUE (medicine_batch_id, medicine_id),
    CONSTRAINT ck_medicine_batches_prices CHECK (purchase_price >= 0 AND selling_price >= 0),
    CONSTRAINT ck_medicine_batches_quantity_received CHECK (quantity_received > 0),
    CONSTRAINT ck_medicine_batches_quantity_on_hand CHECK (
        quantity_on_hand >= 0 AND quantity_on_hand <= quantity_received
    ),
    CONSTRAINT ck_medicine_batches_dates CHECK (
        manufactured_date IS NULL OR manufactured_date <= expiry_date
    ),
    CONSTRAINT ck_medicine_batches_status CHECK (
        status IN ('active', 'expired', 'recalled', 'depleted')
    )
);

CREATE TABLE pharmacy_stock_transactions (
    stock_transaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_batch_id uuid NOT NULL,
    medicine_id uuid NOT NULL,
    transaction_type varchar(20) NOT NULL,
    quantity integer NOT NULL,
    patient_id uuid,
    prescription_item_id uuid,
    invoice_item_id uuid,
    reference_note varchar(255),
    performed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_stock_transactions_batch_medicine FOREIGN KEY (medicine_batch_id, medicine_id)
        REFERENCES medicine_batches (medicine_batch_id, medicine_id) ON DELETE RESTRICT,
    CONSTRAINT fk_stock_transactions_patient FOREIGN KEY (patient_id)
        REFERENCES patients (patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_stock_transactions_prescription_item FOREIGN KEY (prescription_item_id)
        REFERENCES prescription_items (prescription_item_id) ON DELETE RESTRICT,
    CONSTRAINT fk_stock_transactions_invoice_item FOREIGN KEY (invoice_item_id)
        REFERENCES invoice_items (invoice_item_id) ON DELETE RESTRICT,
    CONSTRAINT ck_stock_transactions_type CHECK (
        transaction_type IN ('stock_in', 'dispense', 'return', 'adjustment', 'expired_writeoff', 'damaged_writeoff')
    ),
    CONSTRAINT ck_stock_transactions_quantity CHECK (quantity <> 0),
    CONSTRAINT ck_stock_transactions_dispense_sign CHECK (
        (transaction_type IN ('stock_in', 'return') AND quantity > 0)
        OR (transaction_type IN ('dispense', 'expired_writeoff', 'damaged_writeoff') AND quantity < 0)
        OR (transaction_type = 'adjustment')
    ),
    CONSTRAINT ck_stock_transactions_dispense_patient CHECK (
        transaction_type <> 'dispense' OR patient_id IS NOT NULL
    )
);

-- Suggested performance indexes.

CREATE INDEX idx_medicines_name ON medicines (medicine_name);
CREATE INDEX idx_medicines_category_status ON medicines (category, status);

CREATE INDEX idx_medicine_batches_medicine_status ON medicine_batches (medicine_id, status);
CREATE INDEX idx_medicine_batches_expiry ON medicine_batches (expiry_date)
    WHERE status = 'active';
CREATE INDEX idx_medicine_batches_low_stock ON medicine_batches (medicine_id, quantity_on_hand)
    WHERE status = 'active';

CREATE INDEX idx_stock_transactions_batch_performed ON pharmacy_stock_transactions (medicine_batch_id, performed_at DESC);
CREATE INDEX idx_stock_transactions_medicine_performed ON pharmacy_stock_transactions (medicine_id, performed_at DESC);
CREATE INDEX idx_stock_transactions_patient ON pharmacy_stock_transactions (patient_id, performed_at DESC)
    WHERE patient_id IS NOT NULL;
CREATE INDEX idx_stock_transactions_prescription_item ON pharmacy_stock_transactions (prescription_item_id)
    WHERE prescription_item_id IS NOT NULL;
CREATE INDEX idx_stock_transactions_type_performed ON pharmacy_stock_transactions (transaction_type, performed_at DESC);

COMMIT;
