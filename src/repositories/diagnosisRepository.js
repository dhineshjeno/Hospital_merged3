// src/repositories/diagnosisRepository.js
// Diagnosis Repository - Database operations for diagnoses
// Part of EHR (Electronic Health Records) with ICD-10 support

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// DIAGNOSIS REPOSITORY
// ============================================================================

/**
 * Create a new diagnosis
 */
async function create(diagnosisData) {
  try {
    const diagnosisId = diagnosisData.diagnosis_id || uuidv4();

    const result = await query(
      `INSERT INTO diagnoses (
        diagnosis_id,
        hospital_id,
        consultation_id,
        patient_id,
        icd_code,
        diagnosis_name,
        is_primary,
        severity,
        status,
        onset_date,
        resolution_date,
        notes,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        diagnosisId,
        diagnosisData.hospital_id,
        diagnosisData.consultation_id,
        diagnosisData.patient_id,
        diagnosisData.icd_code,
        diagnosisData.diagnosis_name,
        diagnosisData.is_primary,
        diagnosisData.severity,
        diagnosisData.status,
        diagnosisData.onset_date,
        diagnosisData.resolution_date || null,
        diagnosisData.notes,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create diagnosis');
    }

    return formatDiagnosis(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find diagnosis by ID
 */
async function findById(hospitalId, diagnosisId) {
  try {
    const result = await query(
      `SELECT * FROM diagnoses 
       WHERE diagnosis_id = $1 AND hospital_id = $2`,
      [diagnosisId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatDiagnosis(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find diagnoses by consultation
 */
async function findByConsultation(hospitalId, consultationId) {
  try {
    const result = await query(
      `SELECT * FROM diagnoses 
       WHERE hospital_id = $1 AND consultation_id = $2
       ORDER BY is_primary DESC, created_at DESC`,
      [hospitalId, consultationId]
    );

    return result.rows.map(formatDiagnosis);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find diagnoses by patient
 */
async function findByPatient(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT * FROM diagnoses 
       WHERE hospital_id = $1 AND patient_id = $2 AND status = 'Active'
       ORDER BY created_at DESC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatDiagnosis);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find by ICD code
 */
async function findByICDCode(hospitalId, icdCode) {
  try {
    const result = await query(
      `SELECT * FROM diagnoses 
       WHERE hospital_id = $1 AND icd_code = $2
       ORDER BY created_at DESC`,
      [hospitalId, icdCode]
    );

    return result.rows.map(formatDiagnosis);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update diagnosis
 */
async function update(hospitalId, diagnosisId, updateData) {
  try {
    const fields = [];
    const values = [hospitalId, diagnosisId];
    let paramCount = 2;

    const updatableFields = [
      'severity',
      'status',
      'resolution_date',
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
      `UPDATE diagnoses 
       SET ${fields.join(', ')}
       WHERE diagnosis_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatDiagnosis(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Mark diagnosis as resolved
 */
async function markResolved(hospitalId, diagnosisId) {
  try {
    const result = await query(
      `UPDATE diagnoses 
       SET status = 'Resolved', resolution_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE diagnosis_id = $1 AND hospital_id = $2
       RETURNING *`,
      [diagnosisId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatDiagnosis(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get primary diagnosis for consultation
 */
async function getPrimaryDiagnosis(hospitalId, consultationId) {
  try {
    const result = await query(
      `SELECT * FROM diagnoses 
       WHERE hospital_id = $1 AND consultation_id = $2 AND is_primary = true
       LIMIT 1`,
      [hospitalId, consultationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatDiagnosis(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get all active diagnoses for patient
 */
async function getActiveDiagnoses(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT * FROM diagnoses 
       WHERE hospital_id = $1 AND patient_id = $2 AND status = 'Active'
       ORDER BY is_primary DESC, created_at DESC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatDiagnosis);
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format diagnosis object
 */
function formatDiagnosis(diagnosisRow) {
  if (!diagnosisRow) {
    return null;
  }

  return {
    diagnosis_id: diagnosisRow.diagnosis_id,
    consultation_id: diagnosisRow.consultation_id,
    patient_id: diagnosisRow.patient_id,
    icd_code: diagnosisRow.icd_code,
    diagnosis_name: diagnosisRow.diagnosis_name,
    is_primary: diagnosisRow.is_primary,
    severity: diagnosisRow.severity,
    status: diagnosisRow.status,
    onset_date: diagnosisRow.onset_date,
    resolution_date: diagnosisRow.resolution_date,
    notes: diagnosisRow.notes,
    created_at: diagnosisRow.created_at,
    updated_at: diagnosisRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByConsultation,
  findByPatient,
  findByICDCode,
  update,
  markResolved,
  getPrimaryDiagnosis,
  getActiveDiagnoses,
  formatDiagnosis,
};