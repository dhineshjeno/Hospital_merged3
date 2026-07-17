BEGIN;

-- Seed data for 004_supporting_modules_schema.sql.
-- Reuses doctor_id, patient_id, and invoice_id values already inserted
-- by 002_dummy_seed_data.sql.

INSERT INTO departments (
    department_id,
    department_code,
    department_name,
    description,
    is_active
) VALUES
    (
        '00000000-0000-0000-0000-000000002001',
        'OPD',
        'Outpatient Department',
        'General outpatient consultations',
        true
    ),
    (
        '00000000-0000-0000-0000-000000002002',
        'CARD',
        'Cardiology',
        'Cardiac care and diagnostics',
        true
    ),
    (
        '00000000-0000-0000-0000-000000002003',
        'PEDS',
        'Pediatrics',
        'Child and adolescent care',
        true
    )
ON CONFLICT (department_id) DO NOTHING;

UPDATE doctors SET department_id = '00000000-0000-0000-0000-000000002001'
    WHERE doctor_id = '00000000-0000-0000-0000-000000000201';
UPDATE doctors SET department_id = '00000000-0000-0000-0000-000000002002'
    WHERE doctor_id = '00000000-0000-0000-0000-000000000202';
UPDATE doctors SET department_id = '00000000-0000-0000-0000-000000002003'
    WHERE doctor_id = '00000000-0000-0000-0000-000000000203';

INSERT INTO lab_test_catalog (
    lab_test_id,
    test_code,
    test_name,
    loinc_code,
    specimen_type,
    department_id,
    default_reference_range,
    default_unit,
    turnaround_time_hours,
    price,
    is_active
) VALUES
    (
        '00000000-0000-0000-0000-000000002101',
        'LT-HGB',
        'Hemoglobin',
        '718-7',
        'Blood',
        '00000000-0000-0000-0000-000000002001',
        '13.0-17.0',
        'g/dL',
        4,
        150.00,
        true
    ),
    (
        '00000000-0000-0000-0000-000000002102',
        'LT-WBC',
        'White Blood Cell Count',
        '6690-2',
        'Blood',
        '00000000-0000-0000-0000-000000002001',
        '4000-11000',
        'cells/uL',
        4,
        180.00,
        true
    ),
    (
        '00000000-0000-0000-0000-000000002103',
        'LT-TROP',
        'Troponin I',
        '10839-9',
        'Blood',
        '00000000-0000-0000-0000-000000002002',
        '0.00-0.04',
        'ng/mL',
        2,
        950.00,
        true
    )
ON CONFLICT (lab_test_id) DO NOTHING;

INSERT INTO lab_order_items (
    lab_order_item_id,
    lab_order_id,
    lab_test_id,
    status,
    sample_collected_at
) VALUES
    (
        '00000000-0000-0000-0000-000000002201',
        '00000000-0000-0000-0000-000000001101',
        '00000000-0000-0000-0000-000000002101',
        'completed',
        TIMESTAMPTZ '2026-06-22 09:45:00+05:30'
    ),
    (
        '00000000-0000-0000-0000-000000002202',
        '00000000-0000-0000-0000-000000001101',
        '00000000-0000-0000-0000-000000002102',
        'completed',
        TIMESTAMPTZ '2026-06-22 09:45:00+05:30'
    ),
    (
        '00000000-0000-0000-0000-000000002203',
        '00000000-0000-0000-0000-000000001102',
        '00000000-0000-0000-0000-000000002103',
        'processing',
        TIMESTAMPTZ '2026-06-22 10:50:00+05:30'
    )
ON CONFLICT (lab_order_item_id) DO NOTHING;

INSERT INTO lab_results (
    lab_result_id,
    lab_order_item_id,
    result_value,
    result_unit,
    reference_range,
    abnormal_flag,
    result_status,
    performed_at,
    verified_at,
    verified_by_doctor_id,
    notes
) VALUES
    (
        '00000000-0000-0000-0000-000000002301',
        '00000000-0000-0000-0000-000000002201',
        '13.8',
        'g/dL',
        '13.0-17.0',
        'normal',
        'final',
        TIMESTAMPTZ '2026-06-22 11:00:00+05:30',
        TIMESTAMPTZ '2026-06-22 12:00:00+05:30',
        '00000000-0000-0000-0000-000000000201',
        'Within normal range'
    ),
    (
        '00000000-0000-0000-0000-000000002302',
        '00000000-0000-0000-0000-000000002202',
        '11200',
        'cells/uL',
        '4000-11000',
        'high',
        'final',
        TIMESTAMPTZ '2026-06-22 11:00:00+05:30',
        TIMESTAMPTZ '2026-06-22 12:00:00+05:30',
        '00000000-0000-0000-0000-000000000201',
        'Mild elevation'
    )
ON CONFLICT (lab_result_id) DO NOTHING;

INSERT INTO insurance_providers (
    insurance_provider_id,
    provider_code,
    provider_name,
    contact_phone,
    contact_email,
    is_active
) VALUES
    (
        '00000000-0000-0000-0000-000000002401',
        'STARHEALTH',
        'Star Health Insurance',
        '+91-1800-425-2255',
        'claims@example-starhealth.com',
        true
    )
ON CONFLICT (insurance_provider_id) DO NOTHING;

INSERT INTO patient_insurance_policies (
    patient_insurance_policy_id,
    patient_id,
    insurance_provider_id,
    policy_number,
    policy_holder_name,
    relationship_to_patient,
    valid_from,
    valid_to,
    coverage_amount,
    status
) VALUES
    (
        '00000000-0000-0000-0000-000000002501',
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000002401',
        'SH-POL-88421',
        'Aarav Sharma',
        'self',
        DATE '2026-01-01',
        DATE '2026-12-31',
        500000.00,
        'active'
    )
ON CONFLICT (patient_insurance_policy_id) DO NOTHING;

INSERT INTO insurance_claims (
    insurance_claim_id,
    patient_insurance_policy_id,
    patient_id,
    invoice_id,
    claim_number,
    claimed_amount,
    approved_amount,
    status,
    submitted_at,
    resolved_at
) VALUES
    (
        '00000000-0000-0000-0000-000000002601',
        '00000000-0000-0000-0000-000000002501',
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000001801',
        'CLM-2026-0001',
        1100.00,
        1100.00,
        'approved',
        TIMESTAMPTZ '2026-06-22 14:00:00+05:30',
        TIMESTAMPTZ '2026-06-24 10:00:00+05:30'
    )
ON CONFLICT (insurance_claim_id) DO NOTHING;

INSERT INTO audit_logs (
    audit_log_id,
    table_name,
    record_id,
    action,
    actor_doctor_id,
    actor_label,
    old_value,
    new_value,
    ip_address,
    occurred_at
) VALUES
    (
        '00000000-0000-0000-0000-000000002701',
        'lab_results',
        '00000000-0000-0000-0000-000000002302',
        'update',
        '00000000-0000-0000-0000-000000000201',
        NULL,
        '{"result_status": "preliminary"}',
        '{"result_status": "final"}',
        '203.0.113.10',
        TIMESTAMPTZ '2026-06-22 12:00:05+05:30'
    )
ON CONFLICT (audit_log_id) DO NOTHING;

INSERT INTO attachments (
    attachment_id,
    owner_table,
    owner_id,
    file_name,
    file_type,
    file_size_bytes,
    storage_path,
    uploaded_by_doctor_id,
    uploaded_at
) VALUES
    (
        '00000000-0000-0000-0000-000000002801',
        'lab_results',
        '00000000-0000-0000-0000-000000002302',
        'cbc_report_0622.pdf',
        'pdf',
        184320,
        'lab-reports/2026/06/cbc_report_0622.pdf',
        '00000000-0000-0000-0000-000000000201',
        TIMESTAMPTZ '2026-06-22 12:05:00+05:30'
    )
ON CONFLICT (attachment_id) DO NOTHING;

COMMIT;
