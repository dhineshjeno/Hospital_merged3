BEGIN;

INSERT INTO patients (
    patient_id,
    medical_record_number,
    first_name,
    middle_name,
    last_name,
    date_of_birth,
    gender,
    blood_group,
    phone,
    email,
    address_line1,
    city,
    state,
    postal_code,
    country,
    emergency_contact_name,
    emergency_contact_phone,
    status
) VALUES
    (
        '00000000-0000-0000-0000-000000000101',
        'MRN-2026-0001',
        'Aarav',
        NULL,
        'Sharma',
        DATE '1990-04-12',
        'male',
        'B+',
        '+91-9876543201',
        'aarav.sharma@example.com',
        '12 Lake View Road',
        'Hyderabad',
        'Telangana',
        '500081',
        'India',
        'Meera Sharma',
        '+91-9876543291',
        'active'
    ),
    (
        '00000000-0000-0000-0000-000000000102',
        'MRN-2026-0002',
        'Ananya',
        NULL,
        'Rao',
        DATE '1985-09-27',
        'female',
        'O+',
        '+91-9876543202',
        'ananya.rao@example.com',
        '44 Park Street',
        'Bengaluru',
        'Karnataka',
        '560001',
        'India',
        'Kiran Rao',
        '+91-9876543292',
        'active'
    ),
    (
        '00000000-0000-0000-0000-000000000103',
        'MRN-2026-0003',
        'Rohan',
        'Kumar',
        'Mehta',
        DATE '1978-01-18',
        'male',
        'A-',
        '+91-9876543203',
        'rohan.mehta@example.com',
        '8 Green Avenue',
        'Pune',
        'Maharashtra',
        '411001',
        'India',
        'Priya Mehta',
        '+91-9876543293',
        'active'
    ),
    (
        '00000000-0000-0000-0000-000000000104',
        'MRN-2026-0004',
        'Sara',
        NULL,
        'Khan',
        DATE '2001-12-03',
        'female',
        'AB+',
        '+91-9876543204',
        'sara.khan@example.com',
        '19 Sunrise Colony',
        'Chennai',
        'Tamil Nadu',
        '600017',
        'India',
        'Imran Khan',
        '+91-9876543294',
        'active'
    )
ON CONFLICT (patient_id) DO NOTHING;

INSERT INTO doctors (
    doctor_id,
    employee_code,
    registration_number,
    first_name,
    last_name,
    specialization,
    department,
    phone,
    email,
    consultation_fee,
    status
) VALUES
    (
        '00000000-0000-0000-0000-000000000201',
        'DOC-2026-001',
        'MCI-REG-1001',
        'Neha',
        'Iyer',
        'General Medicine',
        'Outpatient Department',
        '+91-9876543301',
        'dr.neha.iyer@examplehospital.com',
        700.00,
        'active'
    ),
    (
        '00000000-0000-0000-0000-000000000202',
        'DOC-2026-002',
        'MCI-REG-1002',
        'Vikram',
        'Menon',
        'Cardiology',
        'Cardiology',
        '+91-9876543302',
        'dr.vikram.menon@examplehospital.com',
        1200.00,
        'active'
    ),
    (
        '00000000-0000-0000-0000-000000000203',
        'DOC-2026-003',
        'MCI-REG-1003',
        'Farah',
        'Ali',
        'Pediatrics',
        'Pediatrics',
        '+91-9876543303',
        'dr.farah.ali@examplehospital.com',
        800.00,
        'active'
    )
ON CONFLICT (doctor_id) DO NOTHING;

INSERT INTO doctor_schedules (
    doctor_schedule_id,
    doctor_id,
    day_of_week,
    start_time,
    end_time,
    slot_duration_minutes,
    max_appointments,
    effective_from,
    is_active
) VALUES
    (
        '00000000-0000-0000-0000-000000000301',
        '00000000-0000-0000-0000-000000000201',
        1,
        TIME '09:00',
        TIME '12:00',
        15,
        1,
        DATE '2026-01-01',
        true
    ),
    (
        '00000000-0000-0000-0000-000000000302',
        '00000000-0000-0000-0000-000000000202',
        1,
        TIME '10:00',
        TIME '13:00',
        20,
        1,
        DATE '2026-01-01',
        true
    ),
    (
        '00000000-0000-0000-0000-000000000303',
        '00000000-0000-0000-0000-000000000203',
        2,
        TIME '14:00',
        TIME '17:00',
        15,
        1,
        DATE '2026-01-01',
        true
    )
ON CONFLICT (doctor_schedule_id) DO NOTHING;

INSERT INTO appointments (
    appointment_id,
    patient_id,
    doctor_id,
    doctor_schedule_id,
    scheduled_start_at,
    scheduled_end_at,
    appointment_type,
    status,
    reason
) VALUES
    (
        '00000000-0000-0000-0000-000000000401',
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000301',
        TIMESTAMPTZ '2026-06-22 09:00:00+05:30',
        TIMESTAMPTZ '2026-06-22 09:15:00+05:30',
        'consultation',
        'completed',
        'Fever and body ache for two days'
    ),
    (
        '00000000-0000-0000-0000-000000000402',
        '00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000302',
        TIMESTAMPTZ '2026-06-22 10:00:00+05:30',
        TIMESTAMPTZ '2026-06-22 10:20:00+05:30',
        'consultation',
        'completed',
        'Chest discomfort during exertion'
    ),
    (
        '00000000-0000-0000-0000-000000000403',
        '00000000-0000-0000-0000-000000000103',
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000301',
        TIMESTAMPTZ '2026-06-22 09:30:00+05:30',
        TIMESTAMPTZ '2026-06-22 09:45:00+05:30',
        'follow_up',
        'checked_in',
        'Diabetes follow-up'
    ),
    (
        '00000000-0000-0000-0000-000000000404',
        '00000000-0000-0000-0000-000000000104',
        '00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000303',
        TIMESTAMPTZ '2026-06-23 14:00:00+05:30',
        TIMESTAMPTZ '2026-06-23 14:15:00+05:30',
        'consultation',
        'confirmed',
        'Persistent cough'
    )
ON CONFLICT (appointment_id) DO NOTHING;

INSERT INTO queue_entries (
    queue_entry_id,
    appointment_id,
    patient_id,
    doctor_id,
    queue_date,
    queue_number,
    status,
    priority,
    checked_in_at,
    called_at,
    completed_at
) VALUES
    (
        '00000000-0000-0000-0000-000000000501',
        '00000000-0000-0000-0000-000000000401',
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000201',
        DATE '2026-06-22',
        1,
        'completed',
        0,
        TIMESTAMPTZ '2026-06-22 08:50:00+05:30',
        TIMESTAMPTZ '2026-06-22 09:00:00+05:30',
        TIMESTAMPTZ '2026-06-22 09:20:00+05:30'
    ),
    (
        '00000000-0000-0000-0000-000000000502',
        '00000000-0000-0000-0000-000000000402',
        '00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000202',
        DATE '2026-06-22',
        1,
        'completed',
        2,
        TIMESTAMPTZ '2026-06-22 09:45:00+05:30',
        TIMESTAMPTZ '2026-06-22 10:00:00+05:30',
        TIMESTAMPTZ '2026-06-22 10:35:00+05:30'
    ),
    (
        '00000000-0000-0000-0000-000000000503',
        '00000000-0000-0000-0000-000000000403',
        '00000000-0000-0000-0000-000000000103',
        '00000000-0000-0000-0000-000000000201',
        DATE '2026-06-22',
        2,
        'waiting',
        1,
        TIMESTAMPTZ '2026-06-22 09:15:00+05:30',
        NULL,
        NULL
    )
ON CONFLICT (queue_entry_id) DO NOTHING;

INSERT INTO consultations (
    consultation_id,
    appointment_id,
    patient_id,
    doctor_id,
    consultation_started_at,
    consultation_ended_at,
    chief_complaint,
    history_of_present_illness,
    examination_notes,
    treatment_plan,
    follow_up_date,
    status
) VALUES
    (
        '00000000-0000-0000-0000-000000000601',
        '00000000-0000-0000-0000-000000000401',
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000201',
        TIMESTAMPTZ '2026-06-22 09:02:00+05:30',
        TIMESTAMPTZ '2026-06-22 09:18:00+05:30',
        'Fever and body ache',
        'Symptoms started two days ago with mild sore throat.',
        'Mild fever, throat congestion, no respiratory distress.',
        'Hydration, antipyretic, CBC if fever persists.',
        DATE '2026-06-29',
        'completed'
    ),
    (
        '00000000-0000-0000-0000-000000000602',
        '00000000-0000-0000-0000-000000000402',
        '00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000202',
        TIMESTAMPTZ '2026-06-22 10:03:00+05:30',
        TIMESTAMPTZ '2026-06-22 10:32:00+05:30',
        'Chest discomfort',
        'Discomfort on climbing stairs for one week.',
        'Vitals stable, ECG advised, no acute distress.',
        'ECG, lipid profile, cardiac markers, review with reports.',
        DATE '2026-06-25',
        'completed'
    )
ON CONFLICT (consultation_id) DO NOTHING;

INSERT INTO vitals (
    vital_id,
    consultation_id,
    patient_id,
    recorded_at,
    temperature_celsius,
    systolic_bp,
    diastolic_bp,
    pulse_rate,
    respiratory_rate,
    oxygen_saturation,
    height_cm,
    weight_kg,
    notes
) VALUES
    (
        '00000000-0000-0000-0000-000000000701',
        '00000000-0000-0000-0000-000000000601',
        '00000000-0000-0000-0000-000000000101',
        TIMESTAMPTZ '2026-06-22 08:55:00+05:30',
        38.2,
        118,
        76,
        92,
        18,
        98,
        172.00,
        74.50,
        'Febrile but stable'
    ),
    (
        '00000000-0000-0000-0000-000000000702',
        '00000000-0000-0000-0000-000000000602',
        '00000000-0000-0000-0000-000000000102',
        TIMESTAMPTZ '2026-06-22 09:50:00+05:30',
        36.8,
        132,
        84,
        86,
        16,
        99,
        160.00,
        62.00,
        'Stable at triage'
    )
ON CONFLICT (vital_id) DO NOTHING;

INSERT INTO diagnoses (
    diagnosis_id,
    consultation_id,
    diagnosis_code,
    diagnosis_description,
    diagnosis_type,
    notes
) VALUES
    (
        '00000000-0000-0000-0000-000000000801',
        '00000000-0000-0000-0000-000000000601',
        'J06.9',
        'Acute upper respiratory infection, unspecified',
        'primary',
        'Likely viral etiology'
    ),
    (
        '00000000-0000-0000-0000-000000000802',
        '00000000-0000-0000-0000-000000000602',
        'R07.9',
        'Chest pain, unspecified',
        'provisional',
        'Rule out cardiac cause'
    )
ON CONFLICT (diagnosis_id) DO NOTHING;

INSERT INTO prescriptions (
    prescription_id,
    consultation_id,
    patient_id,
    doctor_id,
    prescription_number,
    prescribed_at,
    status,
    notes
) VALUES
    (
        '00000000-0000-0000-0000-000000000901',
        '00000000-0000-0000-0000-000000000601',
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000201',
        'RX-2026-0001',
        TIMESTAMPTZ '2026-06-22 09:18:00+05:30',
        'active',
        'Return if fever persists beyond 48 hours'
    ),
    (
        '00000000-0000-0000-0000-000000000902',
        '00000000-0000-0000-0000-000000000602',
        '00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000202',
        'RX-2026-0002',
        TIMESTAMPTZ '2026-06-22 10:32:00+05:30',
        'active',
        'Medication after initial cardiac screening'
    )
ON CONFLICT (prescription_id) DO NOTHING;

INSERT INTO prescription_items (
    prescription_item_id,
    prescription_id,
    medicine_name,
    strength,
    dosage,
    route,
    frequency,
    duration_days,
    quantity,
    instructions,
    substitution_allowed
) VALUES
    (
        '00000000-0000-0000-0000-000000001001',
        '00000000-0000-0000-0000-000000000901',
        'Paracetamol',
        '500 mg',
        '1 tablet',
        'oral',
        'Every 8 hours as needed',
        3,
        9,
        'Take after food if fever is above 100 F',
        true
    ),
    (
        '00000000-0000-0000-0000-000000001002',
        '00000000-0000-0000-0000-000000000901',
        'Cetirizine',
        '10 mg',
        '1 tablet',
        'oral',
        'Once at night',
        5,
        5,
        'May cause drowsiness',
        true
    ),
    (
        '00000000-0000-0000-0000-000000001003',
        '00000000-0000-0000-0000-000000000902',
        'Aspirin',
        '75 mg',
        '1 tablet',
        'oral',
        'Once daily',
        7,
        7,
        'Start only after doctor confirmation',
        false
    )
ON CONFLICT (prescription_item_id) DO NOTHING;

INSERT INTO lab_orders (
    lab_order_id,
    consultation_id,
    patient_id,
    doctor_id,
    lab_order_number,
    priority,
    status,
    ordered_at,
    notes
) VALUES
    (
        '00000000-0000-0000-0000-000000001101',
        '00000000-0000-0000-0000-000000000601',
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000201',
        'LAB-2026-0001',
        'routine',
        'completed',
        TIMESTAMPTZ '2026-06-22 09:19:00+05:30',
        'CBC if fever persists'
    ),
    (
        '00000000-0000-0000-0000-000000001102',
        '00000000-0000-0000-0000-000000000602',
        '00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000202',
        'LAB-2026-0002',
        'urgent',
        'processing',
        TIMESTAMPTZ '2026-06-22 10:34:00+05:30',
        'Cardiac workup'
    )
ON CONFLICT (lab_order_id) DO NOTHING;

-- lab_results seed data moved to 005_supporting_modules_seed_data.sql.
-- As of 004_supporting_modules_schema.sql, lab_results no longer stores
-- test_name/loinc_code/specimen_type directly; it references
-- lab_order_items, which references lab_test_catalog. Seeding lab_results
-- here would fail against the redesigned table shape.

INSERT INTO wards (
    ward_id,
    ward_code,
    ward_name,
    ward_type,
    floor,
    capacity,
    is_active
) VALUES
    (
        '00000000-0000-0000-0000-000000001301',
        'GEN-1',
        'General Ward 1',
        'general',
        '1',
        30,
        true
    ),
    (
        '00000000-0000-0000-0000-000000001302',
        'PRV-2',
        'Private Ward 2',
        'private',
        '2',
        12,
        true
    ),
    (
        '00000000-0000-0000-0000-000000001303',
        'ICU-1',
        'Intensive Care Unit',
        'icu',
        '3',
        8,
        true
    )
ON CONFLICT (ward_id) DO NOTHING;

INSERT INTO beds (
    bed_id,
    ward_id,
    bed_number,
    bed_type,
    status
) VALUES
    (
        '00000000-0000-0000-0000-000000001401',
        '00000000-0000-0000-0000-000000001301',
        'G1-001',
        'standard',
        'available'
    ),
    (
        '00000000-0000-0000-0000-000000001402',
        '00000000-0000-0000-0000-000000001301',
        'G1-002',
        'standard',
        'occupied'
    ),
    (
        '00000000-0000-0000-0000-000000001403',
        '00000000-0000-0000-0000-000000001302',
        'P2-001',
        'standard',
        'occupied'
    ),
    (
        '00000000-0000-0000-0000-000000001404',
        '00000000-0000-0000-0000-000000001303',
        'ICU-001',
        'icu',
        'available'
    )
ON CONFLICT (bed_id) DO NOTHING;

INSERT INTO admissions (
    admission_id,
    patient_id,
    admitting_doctor_id,
    appointment_id,
    initial_ward_id,
    initial_bed_id,
    current_ward_id,
    current_bed_id,
    admission_number,
    admitted_at,
    admission_reason,
    status
) VALUES
    (
        '00000000-0000-0000-0000-000000001501',
        '00000000-0000-0000-0000-000000000103',
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000403',
        '00000000-0000-0000-0000-000000001301',
        '00000000-0000-0000-0000-000000001402',
        '00000000-0000-0000-0000-000000001302',
        '00000000-0000-0000-0000-000000001403',
        'ADM-2026-0001',
        TIMESTAMPTZ '2026-06-22 11:00:00+05:30',
        'Observation for uncontrolled diabetes and dehydration',
        'active'
    ),
    (
        '00000000-0000-0000-0000-000000001502',
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000401',
        '00000000-0000-0000-0000-000000001301',
        '00000000-0000-0000-0000-000000001401',
        '00000000-0000-0000-0000-000000001301',
        '00000000-0000-0000-0000-000000001401',
        'ADM-2026-0002',
        TIMESTAMPTZ '2026-06-20 18:00:00+05:30',
        'Short observation for fever',
        'discharged'
    )
ON CONFLICT (admission_id) DO NOTHING;

INSERT INTO transfers (
    transfer_id,
    admission_id,
    from_ward_id,
    from_bed_id,
    to_ward_id,
    to_bed_id,
    requested_by_doctor_id,
    transfer_reason,
    transferred_at,
    status
) VALUES (
    '00000000-0000-0000-0000-000000001601',
    '00000000-0000-0000-0000-000000001501',
    '00000000-0000-0000-0000-000000001301',
    '00000000-0000-0000-0000-000000001402',
    '00000000-0000-0000-0000-000000001302',
    '00000000-0000-0000-0000-000000001403',
    '00000000-0000-0000-0000-000000000201',
    'Moved to private room after stabilization',
    TIMESTAMPTZ '2026-06-22 16:30:00+05:30',
    'completed'
)
ON CONFLICT (transfer_id) DO NOTHING;

INSERT INTO discharges (
    discharge_id,
    admission_id,
    discharged_by_doctor_id,
    discharged_at,
    discharge_type,
    discharge_summary,
    discharge_instructions,
    follow_up_date
) VALUES (
    '00000000-0000-0000-0000-000000001701',
    '00000000-0000-0000-0000-000000001502',
    '00000000-0000-0000-0000-000000000201',
    TIMESTAMPTZ '2026-06-21 10:00:00+05:30',
    'regular',
    'Patient observed overnight for fever. Stable at discharge.',
    'Continue oral fluids and prescribed medicines. Return if fever worsens.',
    DATE '2026-06-28'
)
ON CONFLICT (discharge_id) DO NOTHING;

INSERT INTO invoices (
    invoice_id,
    patient_id,
    appointment_id,
    admission_id,
    invoice_number,
    invoice_date,
    due_date,
    status,
    subtotal_amount,
    discount_amount,
    tax_amount,
    total_amount,
    notes
) VALUES
    (
        '00000000-0000-0000-0000-000000001801',
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000401',
        NULL,
        'INV-2026-0001',
        DATE '2026-06-22',
        DATE '2026-06-22',
        'paid',
        1150.00,
        50.00,
        0.00,
        1100.00,
        'Outpatient consultation and lab billing'
    ),
    (
        '00000000-0000-0000-0000-000000001802',
        '00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000402',
        NULL,
        'INV-2026-0002',
        DATE '2026-06-22',
        DATE '2026-06-25',
        'partially_paid',
        2700.00,
        0.00,
        0.00,
        2700.00,
        'Cardiology consultation and urgent lab order'
    ),
    (
        '00000000-0000-0000-0000-000000001803',
        '00000000-0000-0000-0000-000000000103',
        '00000000-0000-0000-0000-000000000403',
        '00000000-0000-0000-0000-000000001501',
        'INV-2026-0003',
        DATE '2026-06-23',
        DATE '2026-06-30',
        'issued',
        6500.00,
        500.00,
        0.00,
        6000.00,
        'Inpatient bed and admission charges'
    )
ON CONFLICT (invoice_id) DO NOTHING;

INSERT INTO invoice_items (
    invoice_item_id,
    invoice_id,
    item_type,
    reference_id,
    description,
    quantity,
    unit_price,
    discount_amount,
    tax_amount
) VALUES
    (
        '00000000-0000-0000-0000-000000001901',
        '00000000-0000-0000-0000-000000001801',
        'consultation',
        '00000000-0000-0000-0000-000000000601',
        'General medicine consultation',
        1,
        700.00,
        0.00,
        0.00
    ),
    (
        '00000000-0000-0000-0000-000000001902',
        '00000000-0000-0000-0000-000000001801',
        'lab',
        '00000000-0000-0000-0000-000000001101',
        'Complete blood count',
        1,
        450.00,
        50.00,
        0.00
    ),
    (
        '00000000-0000-0000-0000-000000001903',
        '00000000-0000-0000-0000-000000001802',
        'consultation',
        '00000000-0000-0000-0000-000000000602',
        'Cardiology consultation',
        1,
        1200.00,
        0.00,
        0.00
    ),
    (
        '00000000-0000-0000-0000-000000001904',
        '00000000-0000-0000-0000-000000001802',
        'lab',
        '00000000-0000-0000-0000-000000001102',
        'Urgent cardiac lab panel',
        1,
        1500.00,
        0.00,
        0.00
    ),
    (
        '00000000-0000-0000-0000-000000001905',
        '00000000-0000-0000-0000-000000001803',
        'admission',
        '00000000-0000-0000-0000-000000001501',
        'Admission registration charge',
        1,
        1000.00,
        0.00,
        0.00
    ),
    (
        '00000000-0000-0000-0000-000000001906',
        '00000000-0000-0000-0000-000000001803',
        'bed',
        '00000000-0000-0000-0000-000000001403',
        'Private ward bed charge',
        2,
        2750.00,
        500.00,
        0.00
    )
ON CONFLICT (invoice_item_id) DO NOTHING;

INSERT INTO payments (
    payment_id,
    invoice_id,
    payment_number,
    amount,
    payment_method,
    payment_status,
    paid_at,
    transaction_reference,
    notes
) VALUES
    (
        '00000000-0000-0000-0000-000000002001',
        '00000000-0000-0000-0000-000000001801',
        'PAY-2026-0001',
        1100.00,
        'upi',
        'completed',
        TIMESTAMPTZ '2026-06-22 12:30:00+05:30',
        'UPI-DEMO-0001',
        'Paid at billing counter'
    ),
    (
        '00000000-0000-0000-0000-000000002002',
        '00000000-0000-0000-0000-000000001802',
        'PAY-2026-0002',
        1500.00,
        'card',
        'completed',
        TIMESTAMPTZ '2026-06-22 13:00:00+05:30',
        'CARD-DEMO-0002',
        'Partial payment collected'
    )
ON CONFLICT (payment_id) DO NOTHING;

COMMIT;
