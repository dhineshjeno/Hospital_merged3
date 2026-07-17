-- TODO: MULTI-TENANCY (UPDATE: see 006_multi_tenancy_placeholder.sql)
-- This schema was originally single-tenant, pending Person 2's confirmation
-- of the hospitals/users column names and types. That confirmation never
-- arrived in time, so 006_multi_tenancy_placeholder.sql adds a best-effort
-- hospital_id uuid column to the top-level entity tables (patients, doctors,
-- wards, departments, lab_test_catalog, medicines, insurance_providers),
-- nullable, with NO foreign key to a hospitals table (that table does not
-- exist in this codebase yet). Child tables intentionally do not get their
-- own hospital_id column; they derive hospital scope through their parent.
-- If Person 2's actual hospitals table uses a different primary key name
-- or type than hospital_id uuid, this column and its FK (added later) will
-- need to be corrected -- this is a placeholder, not a confirmed contract.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Phase 1: Patient, doctor, appointment, schedule, and queue foundation.

CREATE TABLE patients (
    patient_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_record_number varchar(30) NOT NULL,
    first_name varchar(100) NOT NULL,
    middle_name varchar(100),
    last_name varchar(100) NOT NULL,
    date_of_birth date NOT NULL,
    gender varchar(20) NOT NULL,
    blood_group varchar(5),
    phone varchar(30),
    email varchar(255),
    address_line1 varchar(255),
    address_line2 varchar(255),
    city varchar(100),
    state varchar(100),
    postal_code varchar(20),
    country varchar(100) NOT NULL DEFAULT 'India',
    emergency_contact_name varchar(150),
    emergency_contact_phone varchar(30),
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_patients_medical_record_number UNIQUE (medical_record_number),
    CONSTRAINT ck_patients_gender CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    CONSTRAINT ck_patients_blood_group CHECK (
        blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
    ),
    CONSTRAINT ck_patients_status CHECK (status IN ('active', 'inactive', 'deceased')),
    CONSTRAINT ck_patients_date_of_birth CHECK (date_of_birth <= CURRENT_DATE),
    CONSTRAINT ck_patients_email_format CHECK (
        email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    )
);

CREATE TABLE doctors (
    doctor_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code varchar(30) NOT NULL,
    registration_number varchar(50) NOT NULL,
    first_name varchar(100) NOT NULL,
    last_name varchar(100) NOT NULL,
    specialization varchar(120) NOT NULL,
    department varchar(120),
    phone varchar(30),
    email varchar(255),
    consultation_fee numeric(12, 2) NOT NULL DEFAULT 0,
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_doctors_employee_code UNIQUE (employee_code),
    CONSTRAINT uq_doctors_registration_number UNIQUE (registration_number),
    CONSTRAINT uq_doctors_email UNIQUE (email),
    CONSTRAINT ck_doctors_consultation_fee CHECK (consultation_fee >= 0),
    CONSTRAINT ck_doctors_status CHECK (status IN ('active', 'inactive', 'on_leave', 'retired')),
    CONSTRAINT ck_doctors_email_format CHECK (
        email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    )
);

CREATE TABLE doctor_schedules (
    doctor_schedule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id uuid NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    slot_duration_minutes smallint NOT NULL DEFAULT 15,
    max_appointments smallint NOT NULL DEFAULT 1,
    effective_from date NOT NULL DEFAULT CURRENT_DATE,
    effective_to date,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_doctor_schedules_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE RESTRICT,
    CONSTRAINT uq_doctor_schedules_slot UNIQUE (doctor_id, day_of_week, start_time, effective_from),
    CONSTRAINT uq_doctor_schedules_id_doctor UNIQUE (doctor_schedule_id, doctor_id),
    CONSTRAINT ck_doctor_schedules_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT ck_doctor_schedules_time_range CHECK (start_time < end_time),
    CONSTRAINT ck_doctor_schedules_slot_duration CHECK (slot_duration_minutes > 0),
    CONSTRAINT ck_doctor_schedules_max_appointments CHECK (max_appointments > 0),
    CONSTRAINT ck_doctor_schedules_effective_range CHECK (
        effective_to IS NULL OR effective_to >= effective_from
    ),
    CONSTRAINT ck_doctor_schedules_slot_alignment CHECK (
        MOD((EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::integer, slot_duration_minutes) = 0
    ),
    CONSTRAINT ex_doctor_schedules_no_overlap EXCLUDE USING gist (
        doctor_id WITH =,
        day_of_week WITH =,
        daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&,
        int4range(
            (EXTRACT(EPOCH FROM start_time) / 60)::integer,
            (EXTRACT(EPOCH FROM end_time) / 60)::integer,
            '[)'
        ) WITH &&
    )
    WHERE (is_active)
);

CREATE TABLE appointments (
    appointment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    doctor_schedule_id uuid,
    scheduled_start_at timestamptz NOT NULL,
    scheduled_end_at timestamptz NOT NULL,
    appointment_type varchar(30) NOT NULL DEFAULT 'consultation',
    status varchar(30) NOT NULL DEFAULT 'booked',
    reason text,
    cancellation_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id)
        REFERENCES patients (patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_doctor_schedule FOREIGN KEY (doctor_schedule_id, doctor_id)
        REFERENCES doctor_schedules (doctor_schedule_id, doctor_id) ON DELETE RESTRICT,
    CONSTRAINT uq_appointments_id_patient_doctor UNIQUE (appointment_id, patient_id, doctor_id),
    CONSTRAINT uq_appointments_id_patient UNIQUE (appointment_id, patient_id),
    CONSTRAINT ck_appointments_time_range CHECK (scheduled_start_at < scheduled_end_at),
    CONSTRAINT ck_appointments_type CHECK (
        appointment_type IN ('consultation', 'follow_up', 'emergency', 'lab_review', 'procedure')
    ),
    CONSTRAINT ck_appointments_status CHECK (
        status IN ('booked', 'confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show')
    ),
    CONSTRAINT ex_appointments_doctor_time_no_overlap EXCLUDE USING gist (
        doctor_id WITH =,
        tstzrange(scheduled_start_at, scheduled_end_at, '[)') WITH &&
    )
    WHERE (status IN ('booked', 'confirmed', 'checked_in', 'in_consultation')),
    CONSTRAINT ex_appointments_patient_time_no_overlap EXCLUDE USING gist (
        patient_id WITH =,
        tstzrange(scheduled_start_at, scheduled_end_at, '[)') WITH &&
    )
    WHERE (status IN ('booked', 'confirmed', 'checked_in', 'in_consultation'))
);

CREATE TABLE queue_entries (
    queue_entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    queue_date date NOT NULL DEFAULT CURRENT_DATE,
    queue_number integer NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'waiting',
    priority smallint NOT NULL DEFAULT 0,
    checked_in_at timestamptz NOT NULL DEFAULT now(),
    called_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_queue_entries_appointment_patient_doctor FOREIGN KEY (
        appointment_id,
        patient_id,
        doctor_id
    ) REFERENCES appointments (appointment_id, patient_id, doctor_id) ON DELETE RESTRICT,
    CONSTRAINT fk_queue_entries_patient FOREIGN KEY (patient_id)
        REFERENCES patients (patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_queue_entries_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE RESTRICT,
    CONSTRAINT uq_queue_entries_appointment UNIQUE (appointment_id),
    CONSTRAINT uq_queue_entries_doctor_date_number UNIQUE (doctor_id, queue_date, queue_number),
    CONSTRAINT ck_queue_entries_number CHECK (queue_number > 0),
    CONSTRAINT ck_queue_entries_priority CHECK (priority BETWEEN 0 AND 10),
    CONSTRAINT ck_queue_entries_status CHECK (
        status IN ('waiting', 'called', 'in_service', 'completed', 'cancelled', 'skipped')
    ),
    CONSTRAINT ck_queue_entries_called_after_checkin CHECK (
        called_at IS NULL OR called_at >= checked_in_at
    ),
    CONSTRAINT ck_queue_entries_completed_after_checkin CHECK (
        completed_at IS NULL OR completed_at >= checked_in_at
    )
);

-- Phase 2: Clinical encounter, vitals, diagnosis, and prescription records.

CREATE TABLE consultations (
    consultation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    consultation_started_at timestamptz NOT NULL DEFAULT now(),
    consultation_ended_at timestamptz,
    chief_complaint text NOT NULL,
    history_of_present_illness text,
    examination_notes text,
    treatment_plan text,
    follow_up_date date,
    status varchar(30) NOT NULL DEFAULT 'in_progress',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_consultations_appointment_patient_doctor FOREIGN KEY (
        appointment_id,
        patient_id,
        doctor_id
    ) REFERENCES appointments (appointment_id, patient_id, doctor_id) ON DELETE RESTRICT,
    CONSTRAINT uq_consultations_appointment UNIQUE (appointment_id),
    CONSTRAINT uq_consultations_id_patient UNIQUE (consultation_id, patient_id),
    CONSTRAINT uq_consultations_id_patient_doctor UNIQUE (consultation_id, patient_id, doctor_id),
    CONSTRAINT ck_consultations_status CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    CONSTRAINT ck_consultations_end_after_start CHECK (
        consultation_ended_at IS NULL OR consultation_ended_at >= consultation_started_at
    ),
    CONSTRAINT ck_consultations_follow_up_date CHECK (
        follow_up_date IS NULL OR follow_up_date >= consultation_started_at::date
    )
);

CREATE TABLE vitals (
    vital_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    temperature_celsius numeric(4, 1),
    systolic_bp smallint,
    diastolic_bp smallint,
    pulse_rate smallint,
    respiratory_rate smallint,
    oxygen_saturation smallint,
    height_cm numeric(5, 2),
    weight_kg numeric(5, 2),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_vitals_consultation_patient FOREIGN KEY (consultation_id, patient_id)
        REFERENCES consultations (consultation_id, patient_id) ON DELETE CASCADE,
    CONSTRAINT ck_vitals_temperature CHECK (
        temperature_celsius IS NULL OR temperature_celsius BETWEEN 30 AND 45
    ),
    CONSTRAINT ck_vitals_bp CHECK (
        (systolic_bp IS NULL OR systolic_bp BETWEEN 40 AND 300)
        AND (diastolic_bp IS NULL OR diastolic_bp BETWEEN 20 AND 200)
        AND (systolic_bp IS NULL OR diastolic_bp IS NULL OR systolic_bp > diastolic_bp)
    ),
    CONSTRAINT ck_vitals_pulse CHECK (pulse_rate IS NULL OR pulse_rate BETWEEN 20 AND 250),
    CONSTRAINT ck_vitals_respiratory CHECK (respiratory_rate IS NULL OR respiratory_rate BETWEEN 5 AND 80),
    CONSTRAINT ck_vitals_oxygen CHECK (oxygen_saturation IS NULL OR oxygen_saturation BETWEEN 0 AND 100),
    CONSTRAINT ck_vitals_height CHECK (height_cm IS NULL OR height_cm BETWEEN 20 AND 250),
    CONSTRAINT ck_vitals_weight CHECK (weight_kg IS NULL OR weight_kg BETWEEN 0.5 AND 500)
);

CREATE TABLE diagnoses (
    diagnosis_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id uuid NOT NULL,
    diagnosis_code varchar(30),
    diagnosis_description text NOT NULL,
    diagnosis_type varchar(30) NOT NULL DEFAULT 'primary',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_diagnoses_consultation FOREIGN KEY (consultation_id)
        REFERENCES consultations (consultation_id) ON DELETE CASCADE,
    CONSTRAINT uq_diagnoses_consultation_code_type UNIQUE (
        consultation_id,
        diagnosis_code,
        diagnosis_type
    ),
    CONSTRAINT ck_diagnoses_type CHECK (
        diagnosis_type IN ('primary', 'secondary', 'provisional', 'final')
    )
);

CREATE TABLE prescriptions (
    prescription_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    prescription_number varchar(40) NOT NULL,
    prescribed_at timestamptz NOT NULL DEFAULT now(),
    status varchar(30) NOT NULL DEFAULT 'active',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_prescriptions_consultation_patient_doctor FOREIGN KEY (
        consultation_id,
        patient_id,
        doctor_id
    ) REFERENCES consultations (consultation_id, patient_id, doctor_id) ON DELETE RESTRICT,
    CONSTRAINT uq_prescriptions_number UNIQUE (prescription_number),
    CONSTRAINT ck_prescriptions_status CHECK (
        status IN ('active', 'dispensed', 'partially_dispensed', 'cancelled', 'expired')
    )
);

CREATE TABLE prescription_items (
    prescription_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id uuid NOT NULL,
    medicine_name varchar(255) NOT NULL,
    strength varchar(80),
    dosage varchar(120) NOT NULL,
    route varchar(50),
    frequency varchar(120) NOT NULL,
    duration_days smallint NOT NULL,
    quantity numeric(10, 2) NOT NULL,
    instructions text,
    substitution_allowed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_prescription_items_prescription FOREIGN KEY (prescription_id)
        REFERENCES prescriptions (prescription_id) ON DELETE CASCADE,
    CONSTRAINT ck_prescription_items_duration CHECK (duration_days > 0),
    CONSTRAINT ck_prescription_items_quantity CHECK (quantity > 0)
);

-- Phase 3: Laboratory order and result records.

CREATE TABLE lab_orders (
    lab_order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id uuid,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    lab_order_number varchar(40) NOT NULL,
    priority varchar(20) NOT NULL DEFAULT 'routine',
    status varchar(30) NOT NULL DEFAULT 'ordered',
    ordered_at timestamptz NOT NULL DEFAULT now(),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_lab_orders_consultation_patient_doctor FOREIGN KEY (
        consultation_id,
        patient_id,
        doctor_id
    ) REFERENCES consultations (consultation_id, patient_id, doctor_id) ON DELETE RESTRICT,
    CONSTRAINT fk_lab_orders_patient FOREIGN KEY (patient_id)
        REFERENCES patients (patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_lab_orders_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE RESTRICT,
    CONSTRAINT uq_lab_orders_number UNIQUE (lab_order_number),
    CONSTRAINT ck_lab_orders_priority CHECK (priority IN ('routine', 'urgent', 'stat')),
    CONSTRAINT ck_lab_orders_status CHECK (
        status IN ('ordered', 'sample_collected', 'processing', 'completed', 'cancelled')
    )
);

CREATE TABLE lab_results (
    lab_result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id uuid NOT NULL,
    test_name varchar(200) NOT NULL,
    loinc_code varchar(30),
    specimen_type varchar(100),
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
    CONSTRAINT fk_lab_results_lab_order FOREIGN KEY (lab_order_id)
        REFERENCES lab_orders (lab_order_id) ON DELETE CASCADE,
    CONSTRAINT fk_lab_results_verified_by_doctor FOREIGN KEY (verified_by_doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE SET NULL,
    CONSTRAINT uq_lab_results_order_test UNIQUE (lab_order_id, test_name),
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

-- Phase 4: Billing and payment records.

CREATE TABLE invoices (
    invoice_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL,
    appointment_id uuid,
    admission_id uuid,
    invoice_number varchar(40) NOT NULL,
    invoice_date date NOT NULL DEFAULT CURRENT_DATE,
    due_date date,
    status varchar(30) NOT NULL DEFAULT 'draft',
    subtotal_amount numeric(12, 2) NOT NULL DEFAULT 0,
    discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
    tax_amount numeric(12, 2) NOT NULL DEFAULT 0,
    total_amount numeric(12, 2) NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_invoices_patient FOREIGN KEY (patient_id)
        REFERENCES patients (patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_appointment_patient FOREIGN KEY (appointment_id, patient_id)
        REFERENCES appointments (appointment_id, patient_id) ON DELETE RESTRICT,
    CONSTRAINT uq_invoices_number UNIQUE (invoice_number),
    CONSTRAINT ck_invoices_status CHECK (
        status IN ('draft', 'issued', 'partially_paid', 'paid', 'void', 'refunded')
    ),
    CONSTRAINT ck_invoices_amounts CHECK (
        subtotal_amount >= 0
        AND discount_amount >= 0
        AND tax_amount >= 0
        AND total_amount >= 0
    ),
    CONSTRAINT ck_invoices_due_date CHECK (due_date IS NULL OR due_date >= invoice_date)
);

CREATE TABLE invoice_items (
    invoice_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    item_type varchar(30) NOT NULL,
    reference_id uuid,
    description varchar(255) NOT NULL,
    quantity numeric(10, 2) NOT NULL DEFAULT 1,
    unit_price numeric(12, 2) NOT NULL,
    discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
    tax_amount numeric(12, 2) NOT NULL DEFAULT 0,
    line_total numeric(12, 2) GENERATED ALWAYS AS (
        ((quantity * unit_price) - discount_amount + tax_amount)
    ) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices (invoice_id) ON DELETE CASCADE,
    CONSTRAINT ck_invoice_items_type CHECK (
        item_type IN ('consultation', 'lab', 'pharmacy', 'bed', 'procedure', 'admission', 'other')
    ),
    CONSTRAINT ck_invoice_items_amounts CHECK (
        quantity > 0
        AND unit_price >= 0
        AND discount_amount >= 0
        AND tax_amount >= 0
        AND ((quantity * unit_price) - discount_amount + tax_amount) >= 0
    )
);

CREATE TABLE payments (
    payment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    payment_number varchar(40) NOT NULL,
    amount numeric(12, 2) NOT NULL,
    payment_method varchar(30) NOT NULL,
    payment_status varchar(30) NOT NULL DEFAULT 'completed',
    paid_at timestamptz NOT NULL DEFAULT now(),
    transaction_reference varchar(120),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices (invoice_id) ON DELETE RESTRICT,
    CONSTRAINT uq_payments_number UNIQUE (payment_number),
    CONSTRAINT uq_payments_transaction_reference UNIQUE (transaction_reference),
    CONSTRAINT ck_payments_amount CHECK (amount > 0),
    CONSTRAINT ck_payments_method CHECK (
        payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'insurance', 'wallet', 'other')
    ),
    CONSTRAINT ck_payments_status CHECK (
        payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')
    )
);

-- Phase 5: Ward, bed, admission, transfer, and discharge records.

CREATE TABLE wards (
    ward_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_code varchar(30) NOT NULL,
    ward_name varchar(120) NOT NULL,
    ward_type varchar(30) NOT NULL,
    floor varchar(30),
    capacity integer NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_wards_code UNIQUE (ward_code),
    CONSTRAINT ck_wards_type CHECK (
        ward_type IN ('general', 'private', 'semi_private', 'icu', 'nicu', 'emergency', 'maternity')
    ),
    CONSTRAINT ck_wards_capacity CHECK (capacity > 0)
);

CREATE TABLE beds (
    bed_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id uuid NOT NULL,
    bed_number varchar(30) NOT NULL,
    bed_type varchar(30) NOT NULL DEFAULT 'standard',
    status varchar(30) NOT NULL DEFAULT 'available',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_beds_ward FOREIGN KEY (ward_id)
        REFERENCES wards (ward_id) ON DELETE RESTRICT,
    CONSTRAINT uq_beds_ward_number UNIQUE (ward_id, bed_number),
    CONSTRAINT uq_beds_id_ward UNIQUE (bed_id, ward_id),
    CONSTRAINT ck_beds_type CHECK (bed_type IN ('standard', 'icu', 'ventilator', 'isolation')),
    CONSTRAINT ck_beds_status CHECK (
        status IN ('available', 'occupied', 'reserved', 'maintenance', 'cleaning')
    )
);

CREATE TABLE admissions (
    admission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL,
    admitting_doctor_id uuid NOT NULL,
    appointment_id uuid,
    initial_ward_id uuid NOT NULL,
    initial_bed_id uuid NOT NULL,
    current_ward_id uuid NOT NULL,
    current_bed_id uuid NOT NULL,
    admission_number varchar(40) NOT NULL,
    admitted_at timestamptz NOT NULL DEFAULT now(),
    admission_reason text NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_admissions_patient FOREIGN KEY (patient_id)
        REFERENCES patients (patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_admissions_admitting_doctor FOREIGN KEY (admitting_doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE RESTRICT,
    CONSTRAINT fk_admissions_appointment_patient FOREIGN KEY (appointment_id, patient_id)
        REFERENCES appointments (appointment_id, patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_admissions_initial_ward FOREIGN KEY (initial_ward_id)
        REFERENCES wards (ward_id) ON DELETE RESTRICT,
    CONSTRAINT fk_admissions_initial_bed_ward FOREIGN KEY (initial_bed_id, initial_ward_id)
        REFERENCES beds (bed_id, ward_id) ON DELETE RESTRICT,
    CONSTRAINT fk_admissions_current_ward FOREIGN KEY (current_ward_id)
        REFERENCES wards (ward_id) ON DELETE RESTRICT,
    CONSTRAINT fk_admissions_current_bed_ward FOREIGN KEY (current_bed_id, current_ward_id)
        REFERENCES beds (bed_id, ward_id) ON DELETE RESTRICT,
    CONSTRAINT uq_admissions_number UNIQUE (admission_number),
    CONSTRAINT uq_admissions_id_patient UNIQUE (admission_id, patient_id),
    CONSTRAINT ck_admissions_status CHECK (status IN ('active', 'discharged', 'cancelled'))
);

CREATE TABLE transfers (
    transfer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id uuid NOT NULL,
    from_ward_id uuid NOT NULL,
    from_bed_id uuid NOT NULL,
    to_ward_id uuid NOT NULL,
    to_bed_id uuid NOT NULL,
    requested_by_doctor_id uuid,
    transfer_reason text NOT NULL,
    transferred_at timestamptz NOT NULL DEFAULT now(),
    status varchar(30) NOT NULL DEFAULT 'completed',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_transfers_admission FOREIGN KEY (admission_id)
        REFERENCES admissions (admission_id) ON DELETE CASCADE,
    CONSTRAINT fk_transfers_from_ward FOREIGN KEY (from_ward_id)
        REFERENCES wards (ward_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_from_bed_ward FOREIGN KEY (from_bed_id, from_ward_id)
        REFERENCES beds (bed_id, ward_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_to_ward FOREIGN KEY (to_ward_id)
        REFERENCES wards (ward_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_to_bed_ward FOREIGN KEY (to_bed_id, to_ward_id)
        REFERENCES beds (bed_id, ward_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_requested_by_doctor FOREIGN KEY (requested_by_doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE SET NULL,
    CONSTRAINT ck_transfers_status CHECK (status IN ('completed', 'cancelled')),
    CONSTRAINT ck_transfers_different_bed CHECK (from_bed_id <> to_bed_id)
);

CREATE TABLE discharges (
    discharge_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id uuid NOT NULL,
    discharged_by_doctor_id uuid NOT NULL,
    discharged_at timestamptz NOT NULL DEFAULT now(),
    discharge_type varchar(30) NOT NULL DEFAULT 'regular',
    discharge_summary text NOT NULL,
    discharge_instructions text,
    follow_up_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_discharges_admission FOREIGN KEY (admission_id)
        REFERENCES admissions (admission_id) ON DELETE RESTRICT,
    CONSTRAINT fk_discharges_discharged_by_doctor FOREIGN KEY (discharged_by_doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE RESTRICT,
    CONSTRAINT uq_discharges_admission UNIQUE (admission_id),
    CONSTRAINT ck_discharges_type CHECK (
        discharge_type IN ('regular', 'against_medical_advice', 'referred', 'death')
    ),
    CONSTRAINT ck_discharges_follow_up_date CHECK (
        follow_up_date IS NULL OR follow_up_date >= discharged_at::date
    )
);

ALTER TABLE invoices
    ADD CONSTRAINT fk_invoices_admission_patient FOREIGN KEY (admission_id, patient_id)
    REFERENCES admissions (admission_id, patient_id) ON DELETE RESTRICT;

-- Suggested performance indexes.

CREATE INDEX idx_patients_name ON patients (last_name, first_name);
CREATE INDEX idx_patients_phone ON patients (phone);
CREATE INDEX idx_patients_status ON patients (status);

CREATE INDEX idx_doctors_specialization ON doctors (specialization);
CREATE INDEX idx_doctors_department_status ON doctors (department, status);

CREATE INDEX idx_doctor_schedules_doctor_active ON doctor_schedules (doctor_id, is_active);
CREATE INDEX idx_doctor_schedules_day_time ON doctor_schedules (day_of_week, start_time, end_time);

CREATE INDEX idx_appointments_patient_start ON appointments (patient_id, scheduled_start_at DESC);
CREATE INDEX idx_appointments_doctor_start ON appointments (doctor_id, scheduled_start_at);
CREATE INDEX idx_appointments_status_start ON appointments (status, scheduled_start_at);

CREATE INDEX idx_queue_entries_doctor_date_status ON queue_entries (doctor_id, queue_date, status);
CREATE INDEX idx_queue_entries_patient_date ON queue_entries (patient_id, queue_date DESC);
CREATE INDEX idx_queue_entries_active ON queue_entries (doctor_id, queue_date, priority DESC, queue_number)
    WHERE status IN ('waiting', 'called', 'in_service');

CREATE INDEX idx_consultations_patient_started ON consultations (patient_id, consultation_started_at DESC);
CREATE INDEX idx_consultations_doctor_started ON consultations (doctor_id, consultation_started_at DESC);
CREATE INDEX idx_consultations_status ON consultations (status);

CREATE INDEX idx_vitals_consultation_recorded ON vitals (consultation_id, recorded_at DESC);
CREATE INDEX idx_vitals_patient_recorded ON vitals (patient_id, recorded_at DESC);

CREATE INDEX idx_diagnoses_consultation ON diagnoses (consultation_id);
CREATE INDEX idx_diagnoses_code ON diagnoses (diagnosis_code);

CREATE INDEX idx_prescriptions_consultation ON prescriptions (consultation_id);
CREATE INDEX idx_prescriptions_patient_prescribed ON prescriptions (patient_id, prescribed_at DESC);
CREATE INDEX idx_prescription_items_prescription ON prescription_items (prescription_id);

CREATE INDEX idx_lab_orders_patient_ordered ON lab_orders (patient_id, ordered_at DESC);
CREATE INDEX idx_lab_orders_doctor_ordered ON lab_orders (doctor_id, ordered_at DESC);
CREATE INDEX idx_lab_orders_status_priority ON lab_orders (status, priority, ordered_at);
CREATE INDEX idx_lab_results_order_status ON lab_results (lab_order_id, result_status);

CREATE INDEX idx_invoices_patient_date ON invoices (patient_id, invoice_date DESC);
CREATE INDEX idx_invoices_status_due_date ON invoices (status, due_date);
CREATE INDEX idx_invoices_appointment ON invoices (appointment_id);
CREATE INDEX idx_invoices_admission ON invoices (admission_id);
CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_type_reference ON invoice_items (item_type, reference_id);
CREATE INDEX idx_payments_invoice_paid ON payments (invoice_id, paid_at DESC);
CREATE INDEX idx_payments_status_paid ON payments (payment_status, paid_at DESC);

CREATE INDEX idx_beds_ward_status ON beds (ward_id, status);
CREATE INDEX idx_admissions_patient_status ON admissions (patient_id, status);
CREATE INDEX idx_admissions_current_bed ON admissions (current_bed_id);
CREATE UNIQUE INDEX uq_admissions_one_active_patient ON admissions (patient_id)
    WHERE status = 'active';
CREATE UNIQUE INDEX uq_admissions_one_active_bed ON admissions (current_bed_id)
    WHERE status = 'active';
CREATE INDEX idx_transfers_admission_time ON transfers (admission_id, transferred_at DESC);
CREATE INDEX idx_discharges_discharged_at ON discharges (discharged_at DESC);

COMMIT;
