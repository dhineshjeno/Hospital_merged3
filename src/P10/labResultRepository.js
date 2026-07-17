// src/repositories/labResultRepository.js
// Lab Result Repository - Database operations for lab results

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// LAB RESULT REPOSITORY
// ============================================================================

/**
 * Create a new lab result
 */
async function create(resultData) {
  try {
    const resultId = resultData.lab_result_id || uuidv4();

    const result = await query(
      `INSERT INTO lab_results (
        lab_result_id,
        hospital_id,
        lab_order_id,
        test_code,
        test_name,
        result_value,
        unit,
        reference_range,
        abnormality_flag,
        notes,
        reported_at,
        reported_by_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        resultId,
        resultData.hospital_id,
        resultData.lab_order_id,
        resultData.test_code,
        resultData.test_name,
        resultData.result_value,
        resultData.unit,
        resultData.reference_range,
        resultData.abnormality_flag,
        resultData.notes,
        resultData.reported_at,
        resultData.reported_by_id,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create lab result');
    }

    return formatLabResult(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find lab result by ID
 */
async function findById(hospitalId, resultId) {
  try {
    const result = await query(
      `SELECT * FROM lab_results 
       WHERE lab_result_id = $1 AND hospital_id = $2`,
      [resultId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatLabResult(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find results by lab order
 */
async function findByOrder(hospitalId, orderId) {
  try {
    const result = await query(
      `SELECT * FROM lab_results 
       WHERE hospital_id = $1 AND lab_order_id = $2
       ORDER BY reported_at DESC`,
      [hospitalId, orderId]
    );

    return result.rows.map(formatLabResult);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find results by patient
 */
async function findByPatient(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT lr.* FROM lab_results lr
       JOIN lab_orders lo ON lr.lab_order_id = lo.lab_order_id
       WHERE lr.hospital_id = $1 AND lo.patient_id = $2
       ORDER BY lr.reported_at DESC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatLabResult);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get abnormal results for patient
 */
async function getAbnormalForPatient(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT lr.* FROM lab_results lr
       JOIN lab_orders lo ON lr.lab_order_id = lo.lab_order_id
       WHERE lr.hospital_id = $1 
       AND lo.patient_id = $2 
       AND lr.abnormality_flag = true
       ORDER BY lr.reported_at DESC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatLabResult);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get critical results (high priority abnormalities)
 */
async function getCriticalResults(hospitalId) {
  try {
    const result = await query(
      `SELECT * FROM lab_results 
       WHERE hospital_id = $1 AND abnormality_flag = true
       ORDER BY reported_at DESC
       LIMIT 50`,
      [hospitalId]
    );

    return result.rows.map(formatLabResult);
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format lab result object
 */
function formatLabResult(resultRow) {
  if (!resultRow) {
    return null;
  }

  return {
    lab_result_id: resultRow.lab_result_id,
    lab_order_id: resultRow.lab_order_id,
    test_code: resultRow.test_code,
    test_name: resultRow.test_name,
    result_value: resultRow.result_value,
    unit: resultRow.unit,
    reference_range: resultRow.reference_range,
    abnormality_flag: resultRow.abnormality_flag,
    notes: resultRow.notes,
    reported_at: resultRow.reported_at,
    reported_by_id: resultRow.reported_by_id,
    created_at: resultRow.created_at,
    updated_at: resultRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByOrder,
  findByPatient,
  getAbnormalForPatient,
  getCriticalResults,
  formatLabResult,
};