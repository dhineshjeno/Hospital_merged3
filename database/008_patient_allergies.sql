BEGIN;
CREATE TABLE IF NOT EXISTS patient_allergies (
    patient_allergy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL,
    allergen varchar(200) NOT NULL,
    allergy_type varchar(50) NOT NULL DEFAULT 'medication',
    severity varchar(20) NOT NULL DEFAULT 'moderate',
    reaction_description text,
    noted_by_doctor_id uuid,
    noted_at timestamptz NOT NULL DEFAULT now(),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_patient_allergies_patient FOREIGN KEY (patient_id)
        REFERENCES patients (patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_patient_allergies_doctor FOREIGN KEY (noted_by_doctor_id)
        REFERENCES doctors (doctor_id) ON DELETE SET NULL,
    CONSTRAINT uq_patient_allergies_patient_allergen UNIQUE (patient_id, allergen),
    CONSTRAINT ck_patient_allergies_type CHECK (
        allergy_type IN ('medication', 'food', 'environmental', 'other')
    ),
    CONSTRAINT ck_patient_allergies_severity CHECK (
        severity IN ('mild', 'moderate', 'severe', 'life_threatening')
    )
);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient ON patient_allergies (patient_id)
    WHERE is_active = true;
COMMIT;
