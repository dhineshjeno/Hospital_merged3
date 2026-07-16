// src/repositories/appointmentRepository.js
// Appointment Repository - Database operations
// All queries scoped to hospital_id for multi-tenancy

const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// APPOINTMENT REPOSITORY
// ============================================================================

/**
 * Create a new appointment
 */
async function create(appointmentData) {
  try {
    const appointmentId = appointmentData.appointment_id || uuidv4();

    const result = await query(
      `INSERT INTO appointments (
        appointment_id,
        hospital_id,
        patient_id,
        doctor_id,
        scheduled_start_at,
        scheduled_end_at,
        appointment_type,
        status,
        reason,
        is_telehealth,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *`,
      [
        appointmentId,
        appointmentData.hospital_id,
        appointmentData.patient_id,
        appointmentData.doctor_id,
        appointmentData.scheduled_start_at,
        appointmentData.scheduled_end_at,
        appointmentData.appointment_type,
        appointmentData.status,
        appointmentData.reason,
        appointmentData.is_telehealth,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create appointment');
    }

    return formatAppointment(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find appointment by ID
 */
async function findById(hospitalId, appointmentId) {
  try {
    const result = await query(
      `SELECT * FROM appointments 
       WHERE appointment_id = $1 AND hospital_id = $2`,
      [appointmentId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatAppointment(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Check if patient has conflicting appointment
 */
async function checkPatientConflict(hospitalId, patientId, startTime, endTime) {
  try {
    const result = await query(
      `SELECT * FROM appointments 
       WHERE hospital_id = $1 
       AND patient_id = $2 
       AND status IN ('Scheduled', 'Check-in', 'In-progress')
       AND (
         (scheduled_start_at < $4 AND scheduled_end_at > $3)
       )`,
      [hospitalId, patientId, startTime, endTime]
    );

    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Check if doctor has conflicting appointment
 */
async function checkDoctorConflict(hospitalId, doctorId, startTime, endTime) {
  try {
    const result = await query(
      `SELECT * FROM appointments 
       WHERE hospital_id = $1 
       AND doctor_id = $2 
       AND status IN ('Scheduled', 'Check-in', 'In-progress')
       AND (
         (scheduled_start_at < $4 AND scheduled_end_at > $3)
       )`,
      [hospitalId, doctorId, startTime, endTime]
    );

    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * List all appointments in hospital with pagination and filters
 */
async function list(hospitalId, offset, limit, filters = {}) {
  try {
    let whereClause = 'WHERE a.hospital_id = $1';
    let params = [hospitalId];
    let paramCount = 1;

    // Apply filters
    if (filters.patient_id) {
      paramCount++;
      whereClause += ` AND a.patient_id = $${paramCount}`;
      params.push(filters.patient_id);
    }

    if (filters.doctor_id) {
      paramCount++;
      whereClause += ` AND a.doctor_id = $${paramCount}`;
      params.push(filters.doctor_id);
    }

    if (filters.status) {
      paramCount++;
      whereClause += ` AND a.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.appointment_type) {
      paramCount++;
      whereClause += ` AND a.appointment_type = $${paramCount}`;
      params.push(filters.appointment_type);
    }

    if (filters.date_from) {
      paramCount++;
      whereClause += ` AND DATE(a.scheduled_start_at) >= $${paramCount}`;
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      paramCount++;
      whereClause += ` AND DATE(a.scheduled_start_at) <= $${paramCount}`;
      params.push(filters.date_to);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM appointments a ${whereClause}`,
      params
    );

    const totalCount = parseInt(countResult.rows[0].count);

    // Get appointments with pagination
    paramCount++;
    paramCount++; // for offset

    const result = await query(
      `SELECT 
        a.*,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        d.specialization,
        u.first_name as doctor_first_name,
        u.last_name as doctor_last_name
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.patient_id
       LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
       LEFT JOIN users u ON d.user_id = u.user_id
       ${whereClause}
       ORDER BY a.scheduled_start_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      [...params, limit, offset]
    );

    return {
      appointments: result.rows.map(formatAppointmentWithDetails),
      totalCount,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update appointment
 */
async function update(hospitalId, appointmentId, updateData) {
  try {
    // Build dynamic UPDATE query
    const fields = [];
    const values = [hospitalId, appointmentId];
    let paramCount = 2;

    if (updateData.status !== undefined) {
      paramCount++;
      fields.push(`status = $${paramCount}`);
      values.push(updateData.status);
    }

    if (updateData.reason !== undefined) {
      paramCount++;
      fields.push(`reason = $${paramCount}`);
      values.push(updateData.reason);
    }

    if (updateData.notes !== undefined) {
      paramCount++;
      fields.push(`notes = $${paramCount}`);
      values.push(updateData.notes);
    }

    if (updateData.actual_start_at !== undefined) {
      paramCount++;
      fields.push(`actual_start_at = $${paramCount}`);
      values.push(updateData.actual_start_at);
    }

    if (updateData.actual_end_at !== undefined) {
      paramCount++;
      fields.push(`actual_end_at = $${paramCount}`);
      values.push(updateData.actual_end_at);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query(
      `UPDATE appointments 
       SET ${fields.join(', ')}
       WHERE appointment_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatAppointment(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get appointments for a doctor on a specific date
 */
async function getDoctorAppointmentsForDate(hospitalId, doctorId, date) {
  try {
    const result = await query(
      `SELECT * FROM appointments 
       WHERE hospital_id = $1 
       AND doctor_id = $2
       AND DATE(scheduled_start_at) = $3
       AND status IN ('Scheduled', 'Check-in', 'In-progress')
       ORDER BY scheduled_start_at ASC`,
      [hospitalId, doctorId, date]
    );

    return result.rows.map(formatAppointment);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get appointments for a patient
 */
async function getPatientAppointments(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT * FROM appointments 
       WHERE hospital_id = $1 AND patient_id = $2
       ORDER BY scheduled_start_at DESC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatAppointment);
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format appointment object
 */
function formatAppointment(appointmentRow) {
  if (!appointmentRow) {
    return null;
  }

  return {
    appointment_id: appointmentRow.appointment_id,
    patient_id: appointmentRow.patient_id,
    doctor_id: appointmentRow.doctor_id,
    scheduled_start_at: appointmentRow.scheduled_start_at,
    scheduled_end_at: appointmentRow.scheduled_end_at,
    actual_start_at: appointmentRow.actual_start_at,
    actual_end_at: appointmentRow.actual_end_at,
    appointment_type: appointmentRow.appointment_type,
    status: appointmentRow.status,
    reason: appointmentRow.reason,
    notes: appointmentRow.notes,
    is_telehealth: appointmentRow.is_telehealth,
    created_at: appointmentRow.created_at,
    updated_at: appointmentRow.updated_at,
    deleted_at: appointmentRow.deleted_at,
  };
}

/**
 * Format appointment with patient and doctor details
 */
function formatAppointmentWithDetails(row) {
  const appointment = formatAppointment(row);
  return {
    ...appointment,
    patient_name: `${row.patient_first_name} ${row.patient_last_name}`,
    doctor_name: `${row.doctor_first_name} ${row.doctor_last_name}`,
    doctor_specialization: row.specialization,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  checkPatientConflict,
  checkDoctorConflict,
  list,
  update,
  getDoctorAppointmentsForDate,
  getPatientAppointments,
  formatAppointment,
  formatAppointmentWithDetails,
};