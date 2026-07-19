const { query } = require('../config/database');

// ─── Global patient search ────────────────────────────────────────────────────

async function searchPatients(hospitalId, searchTerm, page, pageSize) {
  const term = `%${searchTerm.trim()}%`;
  const offset = (page - 1) * pageSize;

  const countResult = await query(
    `SELECT COUNT(*)::int AS total_count FROM patients
     WHERE hospital_id = $1 AND status != 'inactive'
       AND (
         first_name ILIKE $2 OR last_name ILIKE $2
         OR (first_name || ' ' || last_name) ILIKE $2
         OR phone ILIKE $2
         OR email ILIKE $2
         OR medical_record_number ILIKE $2
       )`,
    [hospitalId, term],
  );

  const rowsResult = await query(
    `SELECT
       patient_id, medical_record_number, first_name, middle_name, last_name,
       date_of_birth, gender, blood_group, phone, email, city, state, status,
       EXTRACT(YEAR FROM AGE(date_of_birth))::int AS age
     FROM patients
     WHERE hospital_id = $1 AND status != 'inactive'
       AND (
         first_name ILIKE $2 OR last_name ILIKE $2
         OR (first_name || ' ' || last_name) ILIKE $2
         OR phone ILIKE $2
         OR email ILIKE $2
         OR medical_record_number ILIKE $2
       )
     ORDER BY
       CASE WHEN medical_record_number ILIKE $2 THEN 0
            WHEN (first_name || ' ' || last_name) ILIKE $2 THEN 1
            ELSE 2 END,
       last_name, first_name
     LIMIT $3 OFFSET $4`,
    [hospitalId, term, pageSize, offset],
  );

  return {
    rows: rowsResult.rows,
    totalCount: countResult.rows[0].total_count,
  };
}

// ─── Full medical history summary (used when a doctor opens a patient) ────────

async function getPatientMedicalHistory(hospitalId, patientId) {
  const [
    patientResult,
    visitStatsResult,
    recentVisitsResult,
    activePrescriptionsResult,
    recentDiagnosesResult,
    recentLabsResult,
    upcomingAppointmentsResult,
    allergiesResult,
  ] = await Promise.all([
    query(
      `SELECT
         patient_id, medical_record_number, first_name, middle_name, last_name,
         date_of_birth, EXTRACT(YEAR FROM AGE(date_of_birth))::int AS age,
         gender, blood_group, phone, email,
         address_line1, address_line2, city, state, postal_code, country,
         emergency_contact_name, emergency_contact_phone, status
       FROM patients WHERE hospital_id = $1 AND patient_id = $2`,
      [hospitalId, patientId],
    ),
    // Visit count + last visit date
    query(
      `SELECT
         COUNT(c.*)::int AS total_visits,
         MAX(c.consultation_started_at) AS last_visit_at
       FROM consultations c
       JOIN patients p ON c.patient_id = p.patient_id
       WHERE p.hospital_id = $1 AND c.patient_id = $2 AND c.status = 'completed'`,
      [hospitalId, patientId],
    ),
    // Last 3 consultations
    query(
      `SELECT
         c.consultation_id, c.consultation_started_at, c.status,
         c.chief_complaint, c.treatment_plan,
         d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
         d.specialization
       FROM consultations c
       JOIN patients p ON c.patient_id = p.patient_id
       JOIN doctors d ON d.doctor_id = c.doctor_id
       WHERE p.hospital_id = $1 AND c.patient_id = $2
       ORDER BY c.consultation_started_at DESC LIMIT 3`,
      [hospitalId, patientId],
    ),
    // Active prescriptions
    query(
      `SELECT
         pr.prescription_id, pr.prescription_number, pr.prescribed_at, pr.status,
         d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
         json_agg(json_build_object(
           'medicine_name', pi.medicine_name,
           'dosage', pi.dosage,
           'frequency', pi.frequency,
           'duration_days', pi.duration_days
         ) ORDER BY pi.created_at) AS items
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.patient_id
       JOIN doctors d ON d.doctor_id = pr.doctor_id
       JOIN prescription_items pi ON pi.prescription_id = pr.prescription_id
       WHERE p.hospital_id = $1 AND pr.patient_id = $2 AND pr.status = 'active'
       GROUP BY pr.prescription_id, d.doctor_id
       ORDER BY pr.prescribed_at DESC`,
      [hospitalId, patientId],
    ),
    // Recent 5 diagnoses
    query(
      `SELECT
         diag.diagnosis_id, diag.diagnosis_code, diag.diagnosis_description,
         diag.diagnosis_type, diag.created_at,
         c.consultation_started_at
       FROM diagnoses diag
       JOIN consultations c ON c.consultation_id = diag.consultation_id
       JOIN patients p ON c.patient_id = p.patient_id
       WHERE p.hospital_id = $1 AND c.patient_id = $2
       ORDER BY c.consultation_started_at DESC LIMIT 5`,
      [hospitalId, patientId],
    ),
    // Recent 5 lab orders with status
    query(
      `SELECT
         lo.lab_order_id, lo.lab_order_number, lo.ordered_at, lo.status,
         COUNT(loi.lab_order_item_id)::int AS test_count
       FROM lab_orders lo
       JOIN patients p ON lo.patient_id = p.patient_id
       LEFT JOIN lab_order_items loi ON loi.lab_order_id = lo.lab_order_id
       WHERE p.hospital_id = $1 AND lo.patient_id = $2
       GROUP BY lo.lab_order_id
       ORDER BY lo.ordered_at DESC LIMIT 5`,
      [hospitalId, patientId],
    ),
    // Upcoming appointments
    query(
      `SELECT
         a.appointment_id, a.scheduled_start_at, a.scheduled_end_at,
         a.appointment_type, a.status,
         d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
         d.specialization
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN doctors d ON d.doctor_id = a.doctor_id
       WHERE p.hospital_id = $1 AND a.patient_id = $2
         AND a.status IN ('booked', 'confirmed')
         AND a.scheduled_start_at > now()
       ORDER BY a.scheduled_start_at ASC LIMIT 3`,
      [hospitalId, patientId],
    ),
    // Active allergies
    query(
      `SELECT
         pa.patient_allergy_id, pa.allergen, pa.allergy_type, pa.severity,
         pa.reaction_description, pa.noted_at
       FROM patient_allergies pa
       JOIN patients p ON pa.patient_id = p.patient_id
       WHERE p.hospital_id = $1 AND pa.patient_id = $2 AND pa.is_active = true
       ORDER BY pa.severity DESC, pa.noted_at DESC`,
      [hospitalId, patientId],
    ),
  ]);

  if (!patientResult.rows[0]) return null;

  return {
    patient: patientResult.rows[0],
    visit_summary: {
      total_completed_visits: visitStatsResult.rows[0].total_visits,
      last_visit_at: visitStatsResult.rows[0].last_visit_at,
    },
    recent_visits: recentVisitsResult.rows,
    active_prescriptions: activePrescriptionsResult.rows,
    recent_diagnoses: recentDiagnosesResult.rows,
    recent_lab_orders: recentLabsResult.rows,
    upcoming_appointments: upcomingAppointmentsResult.rows,
    allergies: allergiesResult.rows,
  };
}

// ─── Full visit history (paginated) ──────────────────────────────────────────

async function getVisitHistory(hospitalId, patientId, page, pageSize) {
  const offset = (page - 1) * pageSize;

  const countResult = await query(
    `SELECT COUNT(c.*)::int AS total 
     FROM consultations c
     JOIN patients p ON c.patient_id = p.patient_id
     WHERE p.hospital_id = $1 AND c.patient_id = $2`,
    [hospitalId, patientId],
  );

  const rowsResult = await query(
    `SELECT
       c.consultation_id, c.consultation_started_at, c.consultation_ended_at,
       c.chief_complaint, c.treatment_plan, c.follow_up_date, c.status,
       d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
       d.specialization,
       COALESCE(json_agg(
         json_build_object(
           'diagnosis_id', diag.diagnosis_id,
           'diagnosis_code', diag.diagnosis_code,
           'diagnosis_description', diag.diagnosis_description,
           'diagnosis_type', diag.diagnosis_type
         ) ORDER BY diag.diagnosis_type
       ) FILTER (WHERE diag.diagnosis_id IS NOT NULL), '[]') AS diagnoses
     FROM consultations c
     JOIN patients p ON c.patient_id = p.patient_id
     JOIN doctors d ON d.doctor_id = c.doctor_id
     LEFT JOIN diagnoses diag ON diag.consultation_id = c.consultation_id
     WHERE p.hospital_id = $1 AND c.patient_id = $2
     GROUP BY c.consultation_id, d.doctor_id
     ORDER BY c.consultation_started_at DESC
     LIMIT $3 OFFSET $4`,
    [hospitalId, patientId, pageSize, offset],
  );

  return {
    rows: rowsResult.rows,
    totalCount: countResult.rows[0].total,
  };
}

// ─── Medication history (paginated) ──────────────────────────────────────────

async function getMedicationHistory(hospitalId, patientId, page, pageSize) {
  const offset = (page - 1) * pageSize;

  const countResult = await query(
    `SELECT COUNT(pr.*)::int AS total 
     FROM prescriptions pr
     JOIN patients p ON pr.patient_id = p.patient_id
     WHERE p.hospital_id = $1 AND pr.patient_id = $2`,
    [hospitalId, patientId],
  );

  const rowsResult = await query(
    `SELECT
       p.prescription_id, p.prescription_number, p.prescribed_at, p.status, p.notes,
       d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
       json_agg(
         json_build_object(
           'prescription_item_id', pi.prescription_item_id,
           'medicine_name', pi.medicine_name,
           'strength', pi.strength,
           'dosage', pi.dosage,
           'frequency', pi.frequency,
           'duration_days', pi.duration_days,
           'instructions', pi.instructions
         ) ORDER BY pi.created_at
       ) AS items
     FROM prescriptions p
     JOIN patients pat ON p.patient_id = pat.patient_id
     JOIN doctors d ON d.doctor_id = p.doctor_id
     JOIN prescription_items pi ON pi.prescription_id = p.prescription_id
     WHERE pat.hospital_id = $1 AND p.patient_id = $2
     GROUP BY p.prescription_id, d.doctor_id
     ORDER BY p.prescribed_at DESC
     LIMIT $3 OFFSET $4`,
    [hospitalId, patientId, pageSize, offset],
  );

  return {
    rows: rowsResult.rows,
    totalCount: countResult.rows[0].total,
  };
}

// ─── Allergies ────────────────────────────────────────────────────────────────

async function createAllergy(hospitalId, patientId, data) {
  // Implicitly verify patient belongs to hospital (though assertPatientExists does this too)
  const result = await query(
    `INSERT INTO patient_allergies (
       patient_id, allergen, allergy_type, severity,
       reaction_description, noted_by_doctor_id
     ) 
     SELECT 
       $2, $3, COALESCE($4, 'medication'), COALESCE($5, 'moderate'), $6, $7
     FROM patients WHERE hospital_id = $1 AND patient_id = $2
     RETURNING *`,
    [
      hospitalId,
      patientId,
      data.allergen,
      data.allergy_type || null,
      data.severity || null,
      data.reaction_description || null,
      data.noted_by_doctor_id || null,
    ],
  );
  return result.rows[0];
}

async function listAllergies(hospitalId, patientId, includeInactive) {
  const result = await query(
    `SELECT pa.* FROM patient_allergies pa
     JOIN patients p ON pa.patient_id = p.patient_id
     WHERE p.hospital_id = $1 AND pa.patient_id = $2
     ${includeInactive ? '' : 'AND pa.is_active = true'}
     ORDER BY pa.severity DESC, pa.noted_at DESC`,
    [hospitalId, patientId],
  );
  return result.rows;
}

async function deactivateAllergy(hospitalId, patientAllergyId, patientId) {
  const result = await query(
    `UPDATE patient_allergies pa
     SET is_active = false, updated_at = now()
     FROM patients p
     WHERE p.patient_id = pa.patient_id
       AND p.hospital_id = $1 
       AND pa.patient_allergy_id = $2 
       AND pa.patient_id = $3
     RETURNING pa.*`,
    [hospitalId, patientAllergyId, patientId],
  );
  return result.rows[0] || null;
}

// ─── Emergency contact quick retrieval ───────────────────────────────────────

async function getEmergencyContact(hospitalId, patientId) {
  const result = await query(
    `SELECT
       patient_id, first_name, last_name,
       emergency_contact_name, emergency_contact_phone
     FROM patients WHERE hospital_id = $1 AND patient_id = $2`,
    [hospitalId, patientId],
  );
  return result.rows[0] || null;
}

module.exports = {
  searchPatients,
  getPatientMedicalHistory,
  getVisitHistory,
  getMedicationHistory,
  createAllergy,
  listAllergies,
  deactivateAllergy,
  getEmergencyContact,
};
