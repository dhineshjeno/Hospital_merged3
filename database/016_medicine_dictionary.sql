BEGIN;

CREATE TABLE medicines_dictionary (
    dictionary_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id uuid NOT NULL,
    medicine_code varchar(50) NOT NULL,
    brand_name varchar(255) NOT NULL,
    generic_name varchar(255) NOT NULL,
    strength varchar(100),
    manufacturer varchar(255),
    hsn_code varchar(20),
    status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by uuid, -- user id of the requester
    approved_by uuid, -- user id of the admin who approved
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (hospital_id, medicine_code)
);

CREATE INDEX idx_medicines_dictionary_hospital ON medicines_dictionary(hospital_id);
CREATE INDEX idx_medicines_dictionary_status ON medicines_dictionary(hospital_id, status);

COMMENT ON TABLE medicines_dictionary IS 'Central dictionary of medicines to prevent duplicates.';

COMMIT;
