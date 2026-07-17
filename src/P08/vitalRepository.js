// src/repositories/vitalRepository.js
// Vital Repository - Database operations for vital signs
// Part of EHR (Electronic Health Records)

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// VITAL REPOSITORY
// ============================================================================

/**
 * Create a new vital record
 */
async function create(vitalData) {
  try {
    const vitalId = vitalData.vital_id || uuidv4();

    const result = await query(
      `INSERT INTO vitals (
        vital_id,
        hospital_id,
        patient_id,
        consultation_id,
        temperature_celsius,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        heart_rate_bpm,
        respiratory_rate_breaths_per_min,
        oxygen_saturation_percent,
        blood_glucose_mg_dl,
        weight_kg,
        height_cm,
        recorded_by_id,
        recorded_at,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *`,
      [
        vitalId,
        vitalData.hospital_id,
        vitalData.patient_id,
        vitalData.consultation_id,
        vitalData.temperature_celsius,
        vitalData.blood_pressure_systolic,
        vitalData.blood_pressure_diastolic,
        vitalData.heart_rate_bpm,
        vitalData.respiratory_rate_breaths_per_min,
        vitalData.oxygen_saturation_percent,
        vitalData.blood_glucose_mg_dl,
        vitalData.weight_kg,
        vitalData.height_cm,
        vitalData.recorded_by_id,
        new Date(),
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create vital record');
    }

    return formatVital(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find vital by ID
 */
async function findById(hospitalId, vitalId) {
  try {
    const result = await query(
      `SELECT * FROM vitals 
       WHERE vital_id = $1 AND hospital_id = $2`,
      [vitalId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatVital(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find vitals by patient (recent first)
 */
async function findByPatient(hospitalId, patientId, limit = 20) {
  try {
    const result = await query(
      `SELECT * FROM vitals 
       WHERE hospital_id = $1 AND patient_id = $2
       ORDER BY recorded_at DESC
       LIMIT $3`,
      [hospitalId, patientId, limit]
    );

    return result.rows.map(formatVital);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find vitals by consultation
 */
async function findByConsultation(hospitalId, consultationId) {
  try {
    const result = await query(
      `SELECT * FROM vitals 
       WHERE hospital_id = $1 AND consultation_id = $2
       ORDER BY recorded_at DESC`,
      [hospitalId, consultationId]
    );

    return result.rows.map(formatVital);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get latest vital record for a patient
 */
async function getLatest(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT * FROM vitals 
       WHERE hospital_id = $1 AND patient_id = $2
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [hospitalId, patientId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatVital(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get vital trends for a patient (last N records)
 */
async function getTrends(hospitalId, patientId, days = 7) {
  try {
    const result = await query(
      `SELECT * FROM vitals 
       WHERE hospital_id = $1 
       AND patient_id = $2 
       AND recorded_at >= NOW() - INTERVAL '${days} days'
       ORDER BY recorded_at ASC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatVital);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Check for abnormal vitals
 */
async function getAbnormalVitals(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT * FROM vitals 
       WHERE hospital_id = $1 
       AND patient_id = $2 
       AND (
         temperature_celsius < 36 OR temperature_celsius > 38.5 OR
         blood_pressure_systolic > 140 OR blood_pressure_systolic < 90 OR
         heart_rate_bpm > 100 OR heart_rate_bpm < 60 OR
         oxygen_saturation_percent < 95 OR
         blood_glucose_mg_dl > 200 OR blood_glucose_mg_dl < 70
       )
       ORDER BY recorded_at DESC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatVital);
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format vital object
 */
function formatVital(vitalRow) {
  if (!vitalRow) {
    return null;
  }

  return {
    vital_id: vitalRow.vital_id,
    patient_id: vitalRow.patient_id,
    consultation_id: vitalRow.consultation_id,
    temperature_celsius: vitalRow.temperature_celsius,
    blood_pressure_systolic: vitalRow.blood_pressure_systolic,
    blood_pressure_diastolic: vitalRow.blood_pressure_diastolic,
    heart_rate_bpm: vitalRow.heart_rate_bpm,
    respiratory_rate_breaths_per_min: vitalRow.respiratory_rate_breaths_per_min,
    oxygen_saturation_percent: vitalRow.oxygen_saturation_percent,
    blood_glucose_mg_dl: vitalRow.blood_glucose_mg_dl,
    weight_kg: vitalRow.weight_kg,
    height_cm: vitalRow.height_cm,
    recorded_by_id: vitalRow.recorded_by_id,
    recorded_at: vitalRow.recorded_at,
    created_at: vitalRow.created_at,
    updated_at: vitalRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByPatient,
  findByConsultation,
  getLatest,
  getTrends,
  getAbnormalVitals,
  formatVital,
};