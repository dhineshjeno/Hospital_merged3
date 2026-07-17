BEGIN;

-- Phase 7: Departments, laboratory catalog redesign, insurance/claims,
-- audit logging, and generic file attachments.
-- Depends on: doctors, patients, consultations, lab_orders, invoices (001).

-- ============================================================
-- Departments
-- ============================================================

CREATE TABLE departments (
    department_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    department_code varchar(30) NOT NULL,
    department_name varchar(150) NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_departments_code UNIQUE (department_code),
    CONSTRAINT uq_departments_name UNIQUE (department_name)
);

-- doctors.department was previously free text. department_id is added as a
-- new nullable column so existing rows are not broken; backend can migrate
-- text values into departments and backfill department_id, then the old
-- text column can be dropped in a later migration once backfilled.
ALTER TABLE doctors
    ADD COLUMN department_id uuid;

ALTER TABLE doctors
    ADD CONSTRAINT fk_doctors_department FOREIGN KEY (department_id)
        REFERENCES departments (department_id) ON DELETE SET NULL;

CREATE INDEX idx_doctors_department_id ON doctors (department_id);

COMMENT ON COLUMN doctors.department IS
    'Deprecated free-text department. Use department_id once backfilled.';

-- ============================================================
-- Laboratory catalog redesign
-- ============================================================

CREATE TABLE lab_test_catalog (
    lab_test_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_code varchar(30) NOT NULL,
    test_name varchar(200) NOT NULL,
    loinc_code varchar(30),
    specimen_type varchar(100) NOT NULL,
    department_id uuid,
    default_reference_range varchar(120),
    default_unit varchar(50),
    turnaround_time_hours smallint,
    price numeric(12, 2) NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_lab_test_catalog_department FOREIGN KEY (department_id)
        REFERENCES departments (department_id) ON DELETE SET NULL,
    CONSTRAINT uq_lab_test_catalog_code UNIQUE (test_code),
    CONSTRAINT ck_lab_test_catalog_price CHECK (price >= 0),
    CONSTRAINT ck_lab_test_catalog_turnaround CHECK (
        turnaround_time_hours IS NULL OR turnaround_time_hours > 0
    )
);

CREATE TABLE lab_order_items (
    lab_order_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id uuid NOT NULL,
    lab_test_id uuid NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'ordered',
    sample_collected_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_lab_order_items_lab_order FOREIGN KEY (lab_order_id)
        REFERENCES lab_orders (lab_order_id) ON DELETE CASCADE,
    CONSTRAINT fk_lab_order_items_lab_test FOREIGN KEY (lab_test_id)
        REFERENCES lab_test_catalog (lab_test_id) ON DELETE RESTRICT,
    CONSTRAINT uq_lab_order_items_order_test UNIQUE (lab_order_id, lab_test_id),
    CONSTRAINT uq_lab_order_items_id_order UNIQUE (lab_order_item_id, lab_order_id),
    CONSTRAINT ck_lab_order_items_status CHECK (
        status IN ('ordered', 'sample_collected', 'processing', 'completed', 'cancelled')
    )
);

-- lab_results is redesigned: results now attach to a specific ordered test
-- (lab_order_item_id) instead of storing test_name/loinc_code/specimen_type
-- as free text. This table has only dummy seed data, so it is dropped and
-- recreated rather than altered in place.
DROP TABLE IF EXISTS lab_results;

CREATE TABLE lab_results (
    lab_result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_item_id uuid NOT NULL,
    result_value varchar(255),
    result_unit varchar(50),
    reference_range varchar(120),
    abnormal_flag varchar(20) NOT NULL DEFAULT 'normal',
    result_status varchar(30) NOT NULL DEFAULT 'preliminary',
    performed_at timestamptz,
    verified_at timestamptz,
    verified_by_doctor_id uuid,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_lab_results_lab_order_item FOREIGN KEY (lab_order_item_id)
        REFERENCES lab_order_items (lab_order_item_id) ON DELETE CASCADE,
    CONSTRAINT fk_lab_results_verified_by_doctor FOREIGN KEY (verified_by_doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE SET NULL,
    CONSTRAINT uq_lab_results_order_item UNIQUE (lab_order_item_id),
    CONSTRAINT ck_lab_results_abnormal_flag CHECK (
        abnormal_flag IN ('normal', 'low', 'high', 'critical', 'abnormal')
    ),
    CONSTRAINT ck_lab_results_status CHECK (
        result_status IN ('preliminary', 'final', 'corrected', 'cancelled')
    ),
    CONSTRAINT ck_lab_results_verified_after_performed CHECK (
        verified_at IS NULL OR performed_at IS NULL OR verified_at >= performed_at
    )
);

-- ============================================================
-- Insurance and claims
-- ============================================================

CREATE TABLE insurance_providers (
    insurance_provider_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code varchar(30) NOT NULL,
    provider_name varchar(150) NOT NULL,
    contact_phone varchar(30),
    contact_email varchar(255),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_insurance_providers_code UNIQUE (provider_code),
    CONSTRAINT ck_insurance_providers_email_format CHECK (
        contact_email IS NULL OR contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    )
);

CREATE TABLE patient_insurance_policies (
    patient_insurance_policy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL,
    insurance_provider_id uuid NOT NULL,
    policy_number varchar(80) NOT NULL,
    policy_holder_name varchar(150) NOT NULL,
    relationship_to_patient varchar(30) NOT NULL DEFAULT 'self',
    valid_from date NOT NULL,
    valid_to date,
    coverage_amount numeric(14, 2),
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_patient_insurance_patient FOREIGN KEY (patient_id)
        REFERENCES patients (patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_patient_insurance_provider FOREIGN KEY (insurance_provider_id)
        REFERENCES insurance_providers (insurance_provider_id) ON DELETE RESTRICT,
    CONSTRAINT uq_patient_insurance_provider_policy UNIQUE (insurance_provider_id, policy_number),
    CONSTRAINT uq_patient_insurance_id_patient UNIQUE (patient_insurance_policy_id, patient_id),
    CONSTRAINT ck_patient_insurance_relationship CHECK (
        relationship_to_patient IN ('self', 'spouse', 'child', 'parent', 'other')
    ),
    CONSTRAINT ck_patient_insurance_valid_range CHECK (
        valid_to IS NULL OR valid_to >= valid_from
    ),
    CONSTRAINT ck_patient_insurance_coverage CHECK (
        coverage_amount IS NULL OR coverage_amount >= 0
    ),
    CONSTRAINT ck_patient_insurance_status CHECK (
        status IN ('active', 'expired', 'cancelled')
    )
);

CREATE TABLE insurance_claims (
    insurance_claim_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_insurance_policy_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    claim_number varchar(60) NOT NULL,
    claimed_amount numeric(12, 2) NOT NULL,
    approved_amount numeric(12, 2),
    status varchar(30) NOT NULL DEFAULT 'submitted',
    submitted_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    rejection_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_insurance_claims_policy_patient FOREIGN KEY (
        patient_insurance_policy_id,
        patient_id
    ) REFERENCES patient_insurance_policies (patient_insurance_policy_id, patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_insurance_claims_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices (invoice_id) ON DELETE RESTRICT,
    CONSTRAINT uq_insurance_claims_number UNIQUE (claim_number),
    CONSTRAINT uq_insurance_claims_invoice UNIQUE (invoice_id),
    CONSTRAINT ck_insurance_claims_amounts CHECK (
        claimed_amount > 0
        AND (approved_amount IS NULL OR approved_amount >= 0)
        AND (approved_amount IS NULL OR approved_amount <= claimed_amount)
    ),
    CONSTRAINT ck_insurance_claims_status CHECK (
        status IN ('submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'paid')
    ),
    CONSTRAINT ck_insurance_claims_resolved_after_submitted CHECK (
        resolved_at IS NULL OR resolved_at >= submitted_at
    )
);

-- ============================================================
-- Audit logging
-- ============================================================

-- Generic table-and-record audit trail. actor_doctor_id is used until
-- Person 2's users table exists; actor_label captures a free-text fallback
-- (e.g. "receptionist", "system") for actors with no doctors row.
CREATE TABLE audit_logs (
    audit_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name varchar(80) NOT NULL,
    record_id uuid NOT NULL,
    action varchar(20) NOT NULL,
    actor_doctor_id uuid,
    actor_label varchar(100),
    old_value jsonb,
    new_value jsonb,
    ip_address inet,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_audit_logs_actor_doctor FOREIGN KEY (actor_doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE SET NULL,
    CONSTRAINT ck_audit_logs_action CHECK (
        action IN ('insert', 'update', 'delete', 'soft_delete', 'view')
    )
);

-- ============================================================
-- Generic attachments
-- ============================================================

-- Polymorphic by design: owner_table + owner_id identify the parent record
-- (e.g. lab_results, discharges, consultations). Not database-FK-enforced,
-- consistent with invoice_items.reference_id elsewhere in this schema;
-- enforced at the application layer.
CREATE TABLE attachments (
    attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_table varchar(80) NOT NULL,
    owner_id uuid NOT NULL,
    file_name varchar(255) NOT NULL,
    file_type varchar(30) NOT NULL,
    file_size_bytes bigint NOT NULL,
    storage_path varchar(500) NOT NULL,
    uploaded_by_doctor_id uuid,
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_attachments_uploaded_by_doctor FOREIGN KEY (uploaded_by_doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE SET NULL,
    CONSTRAINT ck_attachments_file_type CHECK (
        file_type IN ('pdf', 'jpg', 'jpeg', 'png', 'dicom', 'other')
    ),
    CONSTRAINT ck_attachments_file_size CHECK (file_size_bytes > 0)
);

-- ============================================================
-- Suggested performance indexes.
-- ============================================================

CREATE INDEX idx_lab_test_catalog_department ON lab_test_catalog (department_id);
CREATE INDEX idx_lab_test_catalog_active ON lab_test_catalog (is_active);

CREATE INDEX idx_lab_order_items_lab_order ON lab_order_items (lab_order_id);
CREATE INDEX idx_lab_order_items_lab_test ON lab_order_items (lab_test_id);
CREATE INDEX idx_lab_order_items_status ON lab_order_items (status);

CREATE INDEX idx_lab_results_verified_status ON lab_results (result_status);

CREATE INDEX idx_patient_insurance_patient ON patient_insurance_policies (patient_id, status);
CREATE INDEX idx_patient_insurance_provider ON patient_insurance_policies (insurance_provider_id);

CREATE INDEX idx_insurance_claims_patient ON insurance_claims (patient_id, submitted_at DESC);
CREATE INDEX idx_insurance_claims_status ON insurance_claims (status, submitted_at);

CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_doctor_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_occurred_at ON audit_logs (occurred_at DESC);

CREATE INDEX idx_attachments_owner ON attachments (owner_table, owner_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments (uploaded_by_doctor_id);

COMMIT;
