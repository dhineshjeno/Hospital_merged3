// src/repositories/patientRepository.js
// Patient Repository - Database operations
// All queries scoped to hospital_id for multi-tenancy

const { query } = require('../config/database');
const EncryptionService = require('../utils/encryption');
const ApiError = require('../utils/ApiError');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// PATIENT REPOSITORY
// ============================================================================

/**
 * Create a new patient
 * 
 * Sensitive fields (Aadhaar, PAN) are encrypted before storage
 */
async function create(patientData) {
  try {
    // Encrypt sensitive fields
    let encryptedAadhaar = null;
    let encryptedPAN = null;

    if (patientData.aadhar_number_encrypted) {
      encryptedAadhaar = EncryptionService.encrypt(patientData.aadhar_number_encrypted);
    }

    if (patientData.pan_number_encrypted) {
      encryptedPAN = EncryptionService.encrypt(patientData.pan_number_encrypted);
    }

    const patientId = patientData.patient_id || uuidv4();

    const result = await query(
      `INSERT INTO patients (
        patient_id,
        hospital_id,
        medical_record_number,
        first_name,
        last_name,
        date_of_birth,
        gender,
        blood_group,
        aadhar_number_encrypted,
        pan_number_encrypted,
        phone,
        email,
        address,
        city,
        state,
        postal_code,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *`,
      [
        patientId,
        patientData.hospital_id,
        patientData.medical_record_number,
        patientData.first_name,
        patientData.last_name,
        patientData.date_of_birth,
        patientData.gender,
        patientData.blood_group,
        encryptedAadhaar,
        encryptedPAN,
        patientData.phone,
        patientData.email,
        patientData.address,
        patientData.city,
        patientData.state,
        patientData.postal_code,
        patientData.emergency_contact_name,
        patientData.emergency_contact_phone,
        patientData.emergency_contact_relation,
        patientData.is_active,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create patient');
    }

    return formatPatient(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw ApiError.conflict('Patient with this medical record number already exists');
    }
    throw error;
  }
}

// ============================================================================

/**
 * Find patient by ID
 * Includes hospital scoping for security
 */
async function findById(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT * FROM patients 
       WHERE patient_id = $1 AND hospital_id = $2`,
      [patientId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatPatient(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find patient by Medical Record Number (MRN)
 */
async function findByMRN(hospitalId, medicalRecordNumber) {
  try {
    const result = await query(
      `SELECT * FROM patients 
       WHERE hospital_id = $1 AND medical_record_number = $2`,
      [hospitalId, medicalRecordNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatPatient(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * List all patients in a hospital with pagination and filters
 */
async function list(hospitalId, offset, limit, filters = {}) {
  try {
    let whereClause = 'WHERE p.hospital_id = $1';
    let params = [hospitalId];
    let paramCount = 1;

    // Apply filters
    if (filters.is_active !== null) {
      paramCount++;
      whereClause += ` AND p.is_active = $${paramCount}`;
      params.push(filters.is_active);
    }

    if (filters.gender) {
      paramCount++;
      whereClause += ` AND p.gender = $${paramCount}`;
      params.push(filters.gender);
    }

    if (filters.blood_group) {
      paramCount++;
      whereClause += ` AND p.blood_group = $${paramCount}`;
      params.push(filters.blood_group);
    }

    // Search by name or phone
    if (filters.search) {
      paramCount++;
      const searchTerm = `%${filters.search}%`;
      whereClause += ` AND (
        LOWER(p.first_name) LIKE LOWER($${paramCount}) OR 
        LOWER(p.last_name) LIKE LOWER($${paramCount}) OR 
        p.medical_record_number LIKE $${paramCount} OR
        p.phone LIKE $${paramCount}
      )`;
      params.push(searchTerm);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM patients p ${whereClause}`,
      params
    );

    const totalCount = parseInt(countResult.rows[0].count);

    // Get patients with pagination
    paramCount++;
    paramCount++; // for offset

    const result = await query(
      `SELECT * FROM patients p 
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      [...params, limit, offset]
    );

    return {
      patients: result.rows.map(formatPatient),
      totalCount,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update patient information
 */
async function update(hospitalId, patientId, updateData) {
  try {
    // Build dynamic UPDATE query
    const fields = [];
    const values = [hospitalId, patientId];
    let paramCount = 2;

    if (updateData.first_name !== undefined) {
      paramCount++;
      fields.push(`first_name = $${paramCount}`);
      values.push(updateData.first_name);
    }

    if (updateData.last_name !== undefined) {
      paramCount++;
      fields.push(`last_name = $${paramCount}`);
      values.push(updateData.last_name);
    }

    if (updateData.email !== undefined) {
      paramCount++;
      fields.push(`email = $${paramCount}`);
      values.push(updateData.email);
    }

    if (updateData.phone !== undefined) {
      paramCount++;
      fields.push(`phone = $${paramCount}`);
      values.push(updateData.phone);
    }

    if (updateData.blood_group !== undefined) {
      paramCount++;
      fields.push(`blood_group = $${paramCount}`);
      values.push(updateData.blood_group);
    }

    if (updateData.address !== undefined) {
      paramCount++;
      fields.push(`address = $${paramCount}`);
      values.push(updateData.address);
    }

    if (updateData.city !== undefined) {
      paramCount++;
      fields.push(`city = $${paramCount}`);
      values.push(updateData.city);
    }

    if (updateData.state !== undefined) {
      paramCount++;
      fields.push(`state = $${paramCount}`);
      values.push(updateData.state);
    }

    if (updateData.postal_code !== undefined) {
      paramCount++;
      fields.push(`postal_code = $${paramCount}`);
      values.push(updateData.postal_code);
    }

    if (updateData.emergency_contact_name !== undefined) {
      paramCount++;
      fields.push(`emergency_contact_name = $${paramCount}`);
      values.push(updateData.emergency_contact_name);
    }

    if (updateData.emergency_contact_phone !== undefined) {
      paramCount++;
      fields.push(`emergency_contact_phone = $${paramCount}`);
      values.push(updateData.emergency_contact_phone);
    }

    if (updateData.emergency_contact_relation !== undefined) {
      paramCount++;
      fields.push(`emergency_contact_relation = $${paramCount}`);
      values.push(updateData.emergency_contact_relation);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query(
      `UPDATE patients 
       SET ${fields.join(', ')}
       WHERE patient_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatPatient(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Soft delete patient (mark as inactive)
 */
async function softDelete(hospitalId, patientId) {
  try {
    const result = await query(
      `UPDATE patients 
       SET is_active = false, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $1 AND hospital_id = $2
       RETURNING *`,
      [patientId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatPatient(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get patient with full medical history
 * Includes: allergies, recent consultations, active prescriptions, recent vitals
 */
async function getFullRecord(hospitalId, patientId) {
  try {
    // Get patient basic info
    const patientResult = await query(
      `SELECT * FROM patients WHERE patient_id = $1 AND hospital_id = $2`,
      [patientId, hospitalId]
    );

    if (patientResult.rows.length === 0) {
      return null;
    }

    const patient = formatPatient(patientResult.rows[0]);

    // Get allergies
    const allergiesResult = await query(
      `SELECT * FROM patient_allergies 
       WHERE patient_id = $1 AND hospital_id = $2
       ORDER BY created_at DESC`,
      [patientId, hospitalId]
    );

    // Get recent consultations (last 10)
    const consultationsResult = await query(
      `SELECT 
        c.consultation_id,
        c.created_at,
        c.chief_complaint,
        c.assessment,
        d.first_name || ' ' || d.last_name as doctor_name
       FROM consultations c
       LEFT JOIN doctors d ON c.doctor_id = d.doctor_id
       WHERE c.patient_id = $1 AND c.hospital_id = $2
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [patientId, hospitalId]
    );

    // Get active prescriptions
    const prescriptionsResult = await query(
      `SELECT 
        p.prescription_id,
        p.issued_date,
        p.expiry_date,
        COUNT(pi.item_id) as medicine_count
       FROM prescriptions p
       LEFT JOIN prescription_items pi ON p.prescription_id = pi.prescription_id
       WHERE p.patient_id = $1 AND p.hospital_id = $2 AND p.status = 'Active'
       GROUP BY p.prescription_id
       ORDER BY p.issued_date DESC
       LIMIT 5`,
      [patientId, hospitalId]
    );

    // Get recent vitals (last 5)
    const vitalsResult = await query(
      `SELECT 
        vital_id,
        temperature_celsius,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        heart_rate_bpm,
        respiratory_rate_breaths_per_min,
        oxygen_saturation_percent,
        recorded_at
       FROM vitals
       WHERE patient_id = $1 AND hospital_id = $2
       ORDER BY recorded_at DESC
       LIMIT 5`,
      [patientId, hospitalId]
    );

    return {
      ...patient,
      allergies: allergiesResult.rows,
      recent_consultations: consultationsResult.rows,
      active_prescriptions: prescriptionsResult.rows,
      recent_vitals: vitalsResult.rows,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format patient object
 * Decrypt sensitive fields, remove sensitive data from response
 */
function formatPatient(patientRow) {
  if (!patientRow) {
    return null;
  }

  // Decrypt sensitive fields (but don't include in response)
  // These should only be decrypted when needed for specific operations
  // For now, keep them encrypted and don't return them in normal responses

  return {
    patient_id: patientRow.patient_id,
    medical_record_number: patientRow.medical_record_number,
    first_name: patientRow.first_name,
    last_name: patientRow.last_name,
    date_of_birth: patientRow.date_of_birth,
    gender: patientRow.gender,
    blood_group: patientRow.blood_group,
    phone: patientRow.phone,
    email: patientRow.email,
    address: patientRow.address,
    city: patientRow.city,
    state: patientRow.state,
    postal_code: patientRow.postal_code,
    emergency_contact_name: patientRow.emergency_contact_name,
    emergency_contact_phone: patientRow.emergency_contact_phone,
    emergency_contact_relation: patientRow.emergency_contact_relation,
    is_active: patientRow.is_active,
    created_at: patientRow.created_at,
    updated_at: patientRow.updated_at,
    deleted_at: patientRow.deleted_at,
    // Note: Sensitive fields (Aadhaar, PAN) not returned in normal responses
    // Only returned when explicitly requested with proper authorization
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByMRN,
  list,
  update,
  softDelete,
  getFullRecord,
  formatPatient,
};