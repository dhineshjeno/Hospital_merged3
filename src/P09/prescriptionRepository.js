// src/repositories/prescriptionRepository.js
// Prescription Repository - Database operations for prescriptions

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// PRESCRIPTION REPOSITORY
// ============================================================================

/**
 * Create a new prescription
 */
async function create(prescriptionData) {
  try {
    const prescriptionId = prescriptionData.prescription_id || uuidv4();

    const result = await query(
      `INSERT INTO prescriptions (
        prescription_id,
        hospital_id,
        patient_id,
        doctor_id,
        consultation_id,
        instructions,
        notes,
        status,
        valid_until,
        issued_at,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *`,
      [
        prescriptionId,
        prescriptionData.hospital_id,
        prescriptionData.patient_id,
        prescriptionData.doctor_id,
        prescriptionData.consultation_id,
        prescriptionData.instructions,
        prescriptionData.notes,
        prescriptionData.status,
        prescriptionData.valid_until,
        prescriptionData.issued_at,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create prescription');
    }

    return formatPrescription(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find prescription by ID
 */
async function findById(hospitalId, prescriptionId) {
  try {
    const result = await query(
      `SELECT * FROM prescriptions 
       WHERE prescription_id = $1 AND hospital_id = $2`,
      [prescriptionId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatPrescription(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find prescriptions by patient
 */
async function findByPatient(hospitalId, patientId, status = null) {
  try {
    let query_str = `SELECT * FROM prescriptions 
                     WHERE hospital_id = $1 AND patient_id = $2`;
    const params = [hospitalId, patientId];

    if (status) {
      query_str += ` AND status = $3`;
      params.push(status);
    }

    query_str += ` ORDER BY issued_at DESC`;

    const result = await query(query_str, params);

    return result.rows.map(formatPrescription);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find prescriptions by doctor
 */
async function findByDoctor(hospitalId, doctorId) {
  try {
    const result = await query(
      `SELECT * FROM prescriptions 
       WHERE hospital_id = $1 AND doctor_id = $2
       ORDER BY issued_at DESC`,
      [hospitalId, doctorId]
    );

    return result.rows.map(formatPrescription);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get prescription with all items
 */
async function getWithItems(hospitalId, prescriptionId) {
  try {
    const prescriptionResult = await query(
      `SELECT * FROM prescriptions 
       WHERE prescription_id = $1 AND hospital_id = $2`,
      [prescriptionId, hospitalId]
    );

    if (prescriptionResult.rows.length === 0) {
      return null;
    }

    const prescription = formatPrescription(prescriptionResult.rows[0]);

    // Get all items for this prescription
    const itemsResult = await query(
      `SELECT * FROM prescription_items 
       WHERE prescription_id = $1 AND hospital_id = $2
       ORDER BY created_at ASC`,
      [prescriptionId, hospitalId]
    );

    return {
      ...prescription,
      items: itemsResult.rows,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update prescription
 */
async function update(hospitalId, prescriptionId, updateData) {
  try {
    const fields = [];
    const values = [hospitalId, prescriptionId];
    let paramCount = 2;

    const updatableFields = [
      'status',
      'instructions',
      'notes',
      'valid_until',
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
      `UPDATE prescriptions 
       SET ${fields.join(', ')}
       WHERE prescription_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatPrescription(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get active prescriptions for patient
 */
async function getActivePrescriptions(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT * FROM prescriptions 
       WHERE hospital_id = $1 AND patient_id = $2 AND status = 'Active'
       ORDER BY issued_at DESC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatPrescription);
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format prescription object
 */
function formatPrescription(prescriptionRow) {
  if (!prescriptionRow) {
    return null;
  }

  return {
    prescription_id: prescriptionRow.prescription_id,
    patient_id: prescriptionRow.patient_id,
    doctor_id: prescriptionRow.doctor_id,
    consultation_id: prescriptionRow.consultation_id,
    instructions: prescriptionRow.instructions,
    notes: prescriptionRow.notes,
    status: prescriptionRow.status,
    valid_until: prescriptionRow.valid_until,
    issued_at: prescriptionRow.issued_at,
    created_at: prescriptionRow.created_at,
    updated_at: prescriptionRow.updated_at,
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
  getWithItems,
  update,
  getActivePrescriptions,
  formatPrescription,
};