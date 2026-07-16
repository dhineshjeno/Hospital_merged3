// src/repositories/consultationRepository.js
// Consultation Repository - Database operations for consultations
// Part of EHR (Electronic Health Records)

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// CONSULTATION REPOSITORY
// ============================================================================

/**
 * Create a new consultation
 */
async function create(consultationData) {
  try {
    const consultationId = consultationData.consultation_id || uuidv4();

    const result = await query(
      `INSERT INTO consultations (
        consultation_id,
        hospital_id,
        appointment_id,
        patient_id,
        doctor_id,
        chief_complaint,
        history_of_present_illness,
        past_medical_history,
        past_surgical_history,
        family_history,
        social_history,
        physical_examination,
        assessment,
        plan,
        notes,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *`,
      [
        consultationId,
        consultationData.hospital_id,
        consultationData.appointment_id,
        consultationData.patient_id,
        consultationData.doctor_id,
        consultationData.chief_complaint,
        consultationData.history_of_present_illness,
        consultationData.past_medical_history,
        consultationData.past_surgical_history,
        consultationData.family_history,
        consultationData.social_history,
        consultationData.physical_examination,
        consultationData.assessment,
        consultationData.plan,
        consultationData.notes,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create consultation');
    }

    return formatConsultation(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find consultation by ID
 */
async function findById(hospitalId, consultationId) {
  try {
    const result = await query(
      `SELECT * FROM consultations 
       WHERE consultation_id = $1 AND hospital_id = $2`,
      [consultationId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatConsultation(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find consultations by patient
 */
async function findByPatient(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT * FROM consultations 
       WHERE hospital_id = $1 AND patient_id = $2
       ORDER BY created_at DESC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatConsultation);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find consultations by doctor
 */
async function findByDoctor(hospitalId, doctorId) {
  try {
    const result = await query(
      `SELECT * FROM consultations 
       WHERE hospital_id = $1 AND doctor_id = $2
       ORDER BY created_at DESC`,
      [hospitalId, doctorId]
    );

    return result.rows.map(formatConsultation);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update consultation
 */
async function update(hospitalId, consultationId, updateData) {
  try {
    const fields = [];
    const values = [hospitalId, consultationId];
    let paramCount = 2;

    const updatableFields = [
      'chief_complaint',
      'history_of_present_illness',
      'past_medical_history',
      'past_surgical_history',
      'family_history',
      'social_history',
      'physical_examination',
      'assessment',
      'plan',
      'notes',
    ];

    updatableFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(updateData[field]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query(
      `UPDATE consultations 
       SET ${fields.join(', ')}
       WHERE consultation_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatConsultation(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get consultation with diagnoses
 */
async function getWithDiagnoses(hospitalId, consultationId) {
  try {
    const consultationResult = await query(
      `SELECT * FROM consultations 
       WHERE consultation_id = $1 AND hospital_id = $2`,
      [consultationId, hospitalId]
    );

    if (consultationResult.rows.length === 0) {
      return null;
    }

    const consultation = formatConsultation(consultationResult.rows[0]);

    // Get diagnoses
    const diagnosesResult = await query(
      `SELECT * FROM diagnoses 
       WHERE consultation_id = $1 AND hospital_id = $2
       ORDER BY is_primary DESC, created_at DESC`,
      [consultationId, hospitalId]
    );

    return {
      ...consultation,
      diagnoses: diagnosesResult.rows,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format consultation object
 */
function formatConsultation(consultationRow) {
  if (!consultationRow) {
    return null;
  }

  return {
    consultation_id: consultationRow.consultation_id,
    appointment_id: consultationRow.appointment_id,
    patient_id: consultationRow.patient_id,
    doctor_id: consultationRow.doctor_id,
    chief_complaint: consultationRow.chief_complaint,
    history_of_present_illness: consultationRow.history_of_present_illness,
    past_medical_history: consultationRow.past_medical_history,
    past_surgical_history: consultationRow.past_surgical_history,
    family_history: consultationRow.family_history,
    social_history: consultationRow.social_history,
    physical_examination: consultationRow.physical_examination,
    assessment: consultationRow.assessment,
    plan: consultationRow.plan,
    notes: consultationRow.notes,
    created_at: consultationRow.created_at,
    updated_at: consultationRow.updated_at,
    deleted_at: consultationRow.deleted_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByPatient,
  findByDoctor,
  update,
  getWithDiagnoses,
  formatConsultation,
};