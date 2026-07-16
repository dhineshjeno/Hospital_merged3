// src/repositories/doctorRepository.js
// Doctor Repository - Database operations
// All queries scoped to hospital_id for multi-tenancy

const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// DOCTOR REPOSITORY
// ============================================================================

/**
 * Create a new doctor
 */
async function create(doctorData) {
  try {
    const doctorId = doctorData.doctor_id || uuidv4();

    const result = await query(
      `INSERT INTO doctors (
        doctor_id,
        hospital_id,
        user_id,
        employee_code,
        specialization,
        registration_number,
        qualification,
        experience_years,
        is_available,
        consultation_fee,
        department_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        doctorId,
        doctorData.hospital_id,
        doctorData.user_id,
        doctorData.employee_code,
        doctorData.specialization,
        doctorData.registration_number,
        doctorData.qualification,
        doctorData.experience_years,
        doctorData.is_available,
        doctorData.consultation_fee,
        doctorData.department_id,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create doctor');
    }

    return formatDoctor(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw ApiError.conflict('Doctor with this employee code or registration number already exists');
    }
    throw error;
  }
}

// ============================================================================

/**
 * Find doctor by ID
 */
async function findById(hospitalId, doctorId) {
  try {
    const result = await query(
      `SELECT * FROM doctors 
       WHERE doctor_id = $1 AND hospital_id = $2`,
      [doctorId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatDoctor(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find doctor by Employee Code
 */
async function findByEmployeeCode(hospitalId, employeeCode) {
  try {
    const result = await query(
      `SELECT * FROM doctors 
       WHERE hospital_id = $1 AND employee_code = $2`,
      [hospitalId, employeeCode]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatDoctor(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find doctor by Registration Number
 */
async function findByRegistrationNumber(hospitalId, registrationNumber) {
  try {
    const result = await query(
      `SELECT * FROM doctors 
       WHERE hospital_id = $1 AND registration_number = $2`,
      [hospitalId, registrationNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatDoctor(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find doctor by User ID
 */
async function findByUserId(hospitalId, userId) {
  try {
    const result = await query(
      `SELECT * FROM doctors 
       WHERE hospital_id = $1 AND user_id = $2`,
      [hospitalId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatDoctor(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * List all doctors in hospital with pagination and filters
 */
async function list(hospitalId, offset, limit, filters = {}) {
  try {
    let whereClause = 'WHERE d.hospital_id = $1';
    let params = [hospitalId];
    let paramCount = 1;

    // Apply filters
    if (filters.is_available !== null) {
      paramCount++;
      whereClause += ` AND d.is_available = $${paramCount}`;
      params.push(filters.is_available);
    }

    if (filters.specialization) {
      paramCount++;
      whereClause += ` AND LOWER(d.specialization) LIKE LOWER($${paramCount})`;
      params.push(`%${filters.specialization}%`);
    }

    if (filters.department_id) {
      paramCount++;
      whereClause += ` AND d.department_id = $${paramCount}`;
      params.push(filters.department_id);
    }

    // Search by name or employee code
    if (filters.search) {
      paramCount++;
      const searchTerm = `%${filters.search}%`;
      whereClause += ` AND (
        LOWER(u.first_name) LIKE LOWER($${paramCount}) OR 
        LOWER(u.last_name) LIKE LOWER($${paramCount}) OR 
        d.employee_code LIKE $${paramCount}
      )`;
      params.push(searchTerm);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM doctors d
       LEFT JOIN users u ON d.user_id = u.user_id
       ${whereClause}`,
      params
    );

    const totalCount = parseInt(countResult.rows[0].count);

    // Get doctors with pagination
    paramCount++;
    paramCount++; // for offset

    const result = await query(
      `SELECT 
        d.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone as user_phone
       FROM doctors d
       LEFT JOIN users u ON d.user_id = u.user_id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      [...params, limit, offset]
    );

    return {
      doctors: result.rows.map(formatDoctorWithUserInfo),
      totalCount,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update doctor information
 */
async function update(hospitalId, doctorId, updateData) {
  try {
    // Build dynamic UPDATE query
    const fields = [];
    const values = [hospitalId, doctorId];
    let paramCount = 2;

    if (updateData.specialization !== undefined) {
      paramCount++;
      fields.push(`specialization = $${paramCount}`);
      values.push(updateData.specialization);
    }

    if (updateData.qualification !== undefined) {
      paramCount++;
      fields.push(`qualification = $${paramCount}`);
      values.push(updateData.qualification);
    }

    if (updateData.experience_years !== undefined) {
      paramCount++;
      fields.push(`experience_years = $${paramCount}`);
      values.push(updateData.experience_years);
    }

    if (updateData.consultation_fee !== undefined) {
      paramCount++;
      fields.push(`consultation_fee = $${paramCount}`);
      values.push(updateData.consultation_fee);
    }

    if (updateData.is_available !== undefined) {
      paramCount++;
      fields.push(`is_available = $${paramCount}`);
      values.push(updateData.is_available);
    }

    if (updateData.department_id !== undefined) {
      paramCount++;
      fields.push(`department_id = $${paramCount}`);
      values.push(updateData.department_id);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query(
      `UPDATE doctors 
       SET ${fields.join(', ')}
       WHERE doctor_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatDoctor(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Soft delete doctor (mark as unavailable)
 */
async function softDelete(hospitalId, doctorId) {
  try {
    const result = await query(
      `UPDATE doctors 
       SET is_available = false, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE doctor_id = $1 AND hospital_id = $2
       RETURNING *`,
      [doctorId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatDoctor(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get doctor schedule for the week
 */
async function getDoctorSchedule(hospitalId, doctorId) {
  try {
    // Get doctor info
    const doctorResult = await query(
      `SELECT * FROM doctors WHERE doctor_id = $1 AND hospital_id = $2`,
      [doctorId, hospitalId]
    );

    if (doctorResult.rows.length === 0) {
      return null;
    }

    const doctor = formatDoctor(doctorResult.rows[0]);

    // Get weekly schedule
    const scheduleResult = await query(
      `SELECT * FROM doctor_schedules 
       WHERE doctor_id = $1 AND hospital_id = $2 AND is_active = true
       ORDER BY day_of_week ASC`,
      [doctorId, hospitalId]
    );

    return {
      ...doctor,
      weekly_schedule: scheduleResult.rows,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get doctor availability for a specific date
 */
async function getDoctorAvailability(hospitalId, doctorId, date) {
  try {
    // Parse date
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    // Get schedule for this day
    const scheduleResult = await query(
      `SELECT * FROM doctor_schedules 
       WHERE doctor_id = $1 AND hospital_id = $2 
       AND day_of_week = $3 AND is_active = true`,
      [doctorId, hospitalId, dayOfWeek]
    );

    if (scheduleResult.rows.length === 0) {
      return {
        is_available: false,
        available_slots: [],
        booked_slots: [],
      };
    }

    const schedule = scheduleResult.rows[0];

    // Get appointments for this date
    const appointmentsResult = await query(
      `SELECT * FROM appointments 
       WHERE doctor_id = $1 AND hospital_id = $2 
       AND DATE(scheduled_start_at) = $3
       AND status IN ('Scheduled', 'Check-in', 'In-progress')
       ORDER BY scheduled_start_at ASC`,
      [doctorId, hospitalId, date]
    );

    // Build available slots
    const availableSlots = generateTimeSlots(
      schedule.start_time,
      schedule.end_time,
      30 // 30-minute slots
    );

    // Mark booked slots
    const bookedSlots = appointmentsResult.rows.map((apt) => ({
      start_time: apt.scheduled_start_at,
      end_time: apt.scheduled_end_at,
    }));

    const availableSlotsAfterBooking = availableSlots.filter((slot) => {
      return !bookedSlots.some((booked) => {
        return slot >= booked.start_time && slot < booked.end_time;
      });
    });

    return {
      is_available: true,
      available_slots: availableSlotsAfterBooking,
      booked_slots: bookedSlots,
      max_appointments_per_day: schedule.max_appointments_per_day,
      booked_count: appointmentsResult.rows.length,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format doctor object
 */
function formatDoctor(doctorRow) {
  if (!doctorRow) {
    return null;
  }

  return {
    doctor_id: doctorRow.doctor_id,
    user_id: doctorRow.user_id,
    employee_code: doctorRow.employee_code,
    specialization: doctorRow.specialization,
    registration_number: doctorRow.registration_number,
    qualification: doctorRow.qualification,
    experience_years: doctorRow.experience_years,
    is_available: doctorRow.is_available,
    consultation_fee: doctorRow.consultation_fee,
    department_id: doctorRow.department_id,
    created_at: doctorRow.created_at,
    updated_at: doctorRow.updated_at,
    deleted_at: doctorRow.deleted_at,
  };
}

/**
 * Format doctor with user information
 */
function formatDoctorWithUserInfo(row) {
  const doctor = formatDoctor(row);
  return {
    ...doctor,
    name: `${row.first_name} ${row.last_name}`,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.user_phone,
  };
}

/**
 * Generate time slots for a given time range
 */
function generateTimeSlots(startTime, endTime, intervalMinutes = 30) {
  const slots = [];
  let current = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);

  while (current < end) {
    slots.push(new Date(current));
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  return slots;
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByEmployeeCode,
  findByRegistrationNumber,
  findByUserId,
  list,
  update,
  softDelete,
  getDoctorSchedule,
  getDoctorAvailability,
  formatDoctor,
  formatDoctorWithUserInfo,
};