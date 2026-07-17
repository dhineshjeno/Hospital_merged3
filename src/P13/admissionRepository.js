// src/repositories/admissionRepository.js
// Admission Repository - Database operations for patient admissions

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// ADMISSION REPOSITORY
// ============================================================================

/**
 * Create a new admission
 */
async function create(admissionData) {
  try {
    const admissionId = admissionData.admission_id || uuidv4();

    const result = await query(
      `INSERT INTO admissions (
        admission_id,
        hospital_id,
        patient_id,
        bed_id,
        doctor_id,
        admission_reason,
        chief_complaint,
        medical_history,
        admission_type,
        expected_stay_days,
        status,
        admitted_at,
        admitted_by_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *`,
      [
        admissionId,
        admissionData.hospital_id,
        admissionData.patient_id,
        admissionData.bed_id,
        admissionData.doctor_id,
        admissionData.admission_reason,
        admissionData.chief_complaint,
        admissionData.medical_history,
        admissionData.admission_type,
        admissionData.expected_stay_days,
        admissionData.status,
        admissionData.admitted_at,
        admissionData.admitted_by_id,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create admission');
    }

    return formatAdmission(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find admission by ID
 */
async function findById(hospitalId, admissionId) {
  try {
    const result = await query(
      `SELECT * FROM admissions 
       WHERE admission_id = $1 AND hospital_id = $2`,
      [admissionId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatAdmission(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find admissions by patient
 */
async function findByPatient(hospitalId, patientId, status = null) {
  try {
    let query_str = `SELECT * FROM admissions 
                     WHERE hospital_id = $1 AND patient_id = $2`;
    const params = [hospitalId, patientId];

    if (status) {
      query_str += ` AND status = $3`;
      params.push(status);
    }

    query_str += ` ORDER BY admitted_at DESC`;

    const result = await query(query_str, params);

    return result.rows.map(formatAdmission);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find active admission for patient
 */
async function findActiveAdmission(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT * FROM admissions 
       WHERE hospital_id = $1 AND patient_id = $2 AND status = 'Active'`,
      [hospitalId, patientId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatAdmission(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update admission
 */
async function update(hospitalId, admissionId, updateData) {
  try {
    const fields = [];
    const values = [hospitalId, admissionId];
    let paramCount = 2;

    const updatableFields = [
      'status',
      'bed_id',
      'discharge_reason',
      'notes',
      'discharged_at',
      'discharged_by_id',
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
      `UPDATE admissions 
       SET ${fields.join(', ')}
       WHERE admission_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatAdmission(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get occupancy statistics
 */
async function getOccupancyStats(hospitalId) {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_admitted,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as currently_admitted,
        COUNT(CASE WHEN status = 'Discharged' THEN 1 END) as discharged
       FROM admissions
       WHERE hospital_id = $1`,
      [hospitalId]
    );

    if (result.rows.length === 0) {
      return {
        total_admitted: 0,
        currently_admitted: 0,
        discharged: 0,
      };
    }

    return result.rows[0];
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get average length of stay
 */
async function getAverageLengthOfStay(hospitalId, days = 30) {
  try {
    const result = await query(
      `SELECT 
        AVG(EXTRACT(DAY FROM (discharged_at - admitted_at))) as avg_days
       FROM admissions
       WHERE hospital_id = $1 
       AND status = 'Discharged'
       AND discharged_at >= NOW() - INTERVAL '${days} days'`,
      [hospitalId]
    );

    if (result.rows.length === 0 || !result.rows[0].avg_days) {
      return 0;
    }

    return parseFloat(result.rows[0].avg_days);
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format admission object
 */
function formatAdmission(admissionRow) {
  if (!admissionRow) {
    return null;
  }

  return {
    admission_id: admissionRow.admission_id,
    patient_id: admissionRow.patient_id,
    bed_id: admissionRow.bed_id,
    doctor_id: admissionRow.doctor_id,
    admission_reason: admissionRow.admission_reason,
    chief_complaint: admissionRow.chief_complaint,
    medical_history: admissionRow.medical_history,
    admission_type: admissionRow.admission_type,
    expected_stay_days: admissionRow.expected_stay_days,
    status: admissionRow.status,
    admitted_at: admissionRow.admitted_at,
    admitted_by_id: admissionRow.admitted_by_id,
    discharged_at: admissionRow.discharged_at,
    discharged_by_id: admissionRow.discharged_by_id,
    discharge_reason: admissionRow.discharge_reason,
    notes: admissionRow.notes,
    created_at: admissionRow.created_at,
    updated_at: admissionRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByPatient,
  findActiveAdmission,
  update,
  getOccupancyStats,
  getAverageLengthOfStay,
  formatAdmission,
};