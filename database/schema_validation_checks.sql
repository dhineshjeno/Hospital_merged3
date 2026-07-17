BEGIN;

DO $$
DECLARE
    patient_id_1 uuid;
    patient_id_2 uuid;
    doctor_id_1 uuid;
    schedule_id_1 uuid;
    appointment_id_1 uuid;
    consultation_id_1 uuid;
    ward_id_1 uuid;
    ward_id_2 uuid;
    bed_id_1 uuid;
    bed_id_2 uuid;
BEGIN
    INSERT INTO patients (
        medical_record_number,
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone
    ) VALUES (
        'MRN-VALIDATION-001',
        'Test',
        'Patient',
        DATE '1990-01-01',
        'male',
        '9000000001'
    )
    RETURNING patient_id INTO patient_id_1;

    INSERT INTO patients (
        medical_record_number,
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone
    ) VALUES (
        'MRN-VALIDATION-002',
        'Other',
        'Patient',
        DATE '1992-01-01',
        'female',
        '9000000002'
    )
    RETURNING patient_id INTO patient_id_2;

    INSERT INTO doctors (
        employee_code,
        registration_number,
        first_name,
        last_name,
        specialization,
        department,
        consultation_fee
    ) VALUES (
        'DOC-VALIDATION-001',
        'REG-VALIDATION-001',
        'Test',
        'Doctor',
        'General Medicine',
        'OPD',
        500
    )
    RETURNING doctor_id INTO doctor_id_1;

    INSERT INTO doctor_schedules (
        doctor_id,
        day_of_week,
        start_time,
        end_time,
        slot_duration_minutes,
        effective_from
    ) VALUES (
        doctor_id_1,
        1,
        TIME '09:00',
        TIME '12:00',
        15,
        CURRENT_DATE
    )
    RETURNING doctor_schedule_id INTO schedule_id_1;

    BEGIN
        INSERT INTO doctor_schedules (
            doctor_id,
            day_of_week,
            start_time,
            end_time,
            slot_duration_minutes,
            effective_from
        ) VALUES (
            doctor_id_1,
            1,
            TIME '10:00',
            TIME '11:00',
            15,
            CURRENT_DATE
        );

        RAISE EXCEPTION 'Expected overlapping doctor schedule to fail';
    EXCEPTION
        WHEN exclusion_violation THEN
            NULL;
    END;

    INSERT INTO appointments (
        patient_id,
        doctor_id,
        doctor_schedule_id,
        scheduled_start_at,
        scheduled_end_at,
        appointment_type,
        status
    ) VALUES (
        patient_id_1,
        doctor_id_1,
        schedule_id_1,
        ((CURRENT_DATE + 1) + TIME '09:00')::timestamptz,
        ((CURRENT_DATE + 1) + TIME '09:30')::timestamptz,
        'consultation',
        'booked'
    )
    RETURNING appointment_id INTO appointment_id_1;

    BEGIN
        INSERT INTO appointments (
            patient_id,
            doctor_id,
            doctor_schedule_id,
            scheduled_start_at,
            scheduled_end_at,
            appointment_type,
            status
        ) VALUES (
            patient_id_1,
            doctor_id_1,
            schedule_id_1,
            ((CURRENT_DATE + 1) + TIME '09:15')::timestamptz,
            ((CURRENT_DATE + 1) + TIME '09:45')::timestamptz,
            'consultation',
            'booked'
        );

        RAISE EXCEPTION 'Expected overlapping appointment to fail';
    EXCEPTION
        WHEN exclusion_violation THEN
            NULL;
    END;

    INSERT INTO consultations (
        appointment_id,
        patient_id,
        doctor_id,
        chief_complaint
    ) VALUES (
        appointment_id_1,
        patient_id_1,
        doctor_id_1,
        'Validation complaint'
    )
    RETURNING consultation_id INTO consultation_id_1;

    BEGIN
        INSERT INTO vitals (
            consultation_id,
            patient_id,
            temperature_celsius
        ) VALUES (
            consultation_id_1,
            patient_id_2,
            37.0
        );

        RAISE EXCEPTION 'Expected mismatched consultation/patient vital to fail';
    EXCEPTION
        WHEN foreign_key_violation THEN
            NULL;
    END;

    BEGIN
        INSERT INTO invoices (
            patient_id,
            appointment_id,
            invoice_number
        ) VALUES (
            patient_id_2,
            appointment_id_1,
            'INV-VALIDATION-001'
        );

        RAISE EXCEPTION 'Expected mismatched appointment/patient invoice to fail';
    EXCEPTION
        WHEN foreign_key_violation THEN
            NULL;
    END;

    INSERT INTO wards (
        ward_code,
        ward_name,
        ward_type,
        capacity
    ) VALUES (
        'WARD-VALIDATION-001',
        'Validation Ward 1',
        'general',
        10
    )
    RETURNING ward_id INTO ward_id_1;

    INSERT INTO wards (
        ward_code,
        ward_name,
        ward_type,
        capacity
    ) VALUES (
        'WARD-VALIDATION-002',
        'Validation Ward 2',
        'private',
        10
    )
    RETURNING ward_id INTO ward_id_2;

    INSERT INTO beds (
        ward_id,
        bed_number,
        bed_type
    ) VALUES (
        ward_id_1,
        'BED-VALIDATION-001',
        'standard'
    )
    RETURNING bed_id INTO bed_id_1;

    INSERT INTO beds (
        ward_id,
        bed_number,
        bed_type
    ) VALUES (
        ward_id_2,
        'BED-VALIDATION-002',
        'standard'
    )
    RETURNING bed_id INTO bed_id_2;

    BEGIN
        INSERT INTO admissions (
            patient_id,
            admitting_doctor_id,
            appointment_id,
            initial_ward_id,
            initial_bed_id,
            current_ward_id,
            current_bed_id,
            admission_number,
            admission_reason
        ) VALUES (
            patient_id_1,
            doctor_id_1,
            appointment_id_1,
            ward_id_1,
            bed_id_2,
            ward_id_1,
            bed_id_2,
            'ADM-VALIDATION-001',
            'Validation admission'
        );

        RAISE EXCEPTION 'Expected mismatched ward/bed admission to fail';
    EXCEPTION
        WHEN foreign_key_violation THEN
            NULL;
    END;
END $$;

ROLLBACK;

SELECT 'schema_validation_checks_passed' AS result;
