BEGIN;

CREATE TABLE patient_wallets (
    wallet_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    balance numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (hospital_id, patient_id)
);
CREATE INDEX idx_patient_wallets_hospital ON patient_wallets(hospital_id);

CREATE TABLE wallet_transactions (
    txn_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id uuid NOT NULL,
    wallet_id uuid NOT NULL REFERENCES patient_wallets(wallet_id),
    patient_id uuid NOT NULL,
    txn_type varchar(20) NOT NULL CHECK (txn_type IN ('credit', 'debit')),
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    balance_after numeric(12,2) NOT NULL,
    reference varchar(255),
    description text,
    created_by uuid,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_wallet_transactions_hospital ON wallet_transactions(hospital_id);
CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);

COMMENT ON TABLE patient_wallets IS 'Advance balance wallet per patient per hospital.';
COMMENT ON TABLE wallet_transactions IS 'Append-only ledger of all wallet credits and debits.';

COMMIT;
