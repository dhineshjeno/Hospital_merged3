// src/validators/appointmentValidator.js
// Appointment Validator - Input validation for appointment operations
// Hospital-grade validation with detailed error messages

/**
 * Validate appointment creation request
 * 
 * Required fields:
 * - patient_id (UUID)
 * - doctor_id (UUID)
 * - scheduled_start_at (ISO datetime)
 * - scheduled_end_at (ISO datetime)
 * - appointment_type (Consultation|Follow-up|Emergency)
 */
function validateCreateAppointment(data) {
  const errors = [];

  // =========================================================================
  // REQUIRED FIELDS
  // =========================================================================

  if (!data.patient_id || !String(data.patient_id).trim()) {
    errors.push('patient_id is required');
  } else if (!isValidUUID(data.patient_id)) {
    errors.push('patient_id must be a valid UUID');
  }

  if (!data.doctor_id || !String(data.doctor_id).trim()) {
    errors.push('doctor_id is required');
  } else if (!isValidUUID(data.doctor_id)) {
    errors.push('doctor_id must be a valid UUID');
  }

  if (!data.scheduled_start_at) {
    errors.push('scheduled_start_at is required');
  } else if (!isValidDateTime(data.scheduled_start_at)) {
    errors.push('scheduled_start_at must be a valid ISO datetime');
  }

  if (!data.scheduled_end_at) {
    errors.push('scheduled_end_at is required');
  } else if (!isValidDateTime(data.scheduled_end_at)) {
    errors.push('scheduled_end_at must be a valid ISO datetime');
  }

  if (data.scheduled_start_at && data.scheduled_end_at) {
    const startTime = new Date(data.scheduled_start_at);
    const endTime = new Date(data.scheduled_end_at);

    if (startTime >= endTime) {
      errors.push('scheduled_end_at must be after scheduled_start_at');
    }

    // Check if appointment is in the past
    if (startTime < new Date()) {
      errors.push('scheduled_start_at cannot be in the past');
    }

    // Check if duration is reasonable (max 2 hours)
    const durationMinutes = (endTime - startTime) / (1000 * 60);
    if (durationMinutes < 5) {
      errors.push('Appointment duration must be at least 5 minutes');
    }
    if (durationMinutes > 120) {
      errors.push('Appointment duration cannot exceed 2 hours');
    }
  }

  if (!data.appointment_type || !String(data.appointment_type).trim()) {
    errors.push('appointment_type is required');
  } else if (!['Consultation', 'Follow-up', 'Emergency'].includes(data.appointment_type)) {
    errors.push('appointment_type must be one of: Consultation, Follow-up, Emergency');
  }

  // =========================================================================
  // OPTIONAL FIELDS
  // =========================================================================

  if (data.reason !== undefined && data.reason !== null && data.reason !== '') {
    if (String(data.reason).trim().length > 255) {
      errors.push('reason must be 255 characters or less');
    }
  }

  if (data.is_telehealth !== undefined && data.is_telehealth !== null) {
    if (typeof data.is_telehealth !== 'boolean') {
      errors.push('is_telehealth must be a boolean (true/false)');
    }
  }

  // =========================================================================
  // RESPONSE
  // =========================================================================

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
      errors,
    };
  }

  return { valid: true };
}

// ============================================================================

/**
 * Validate appointment update request
 * All fields are optional
 */
function validateUpdateAppointment(data) {
  const errors = [];

  // =========================================================================
  // OPTIONAL FIELDS (any can be updated)
  // =========================================================================

  if (data.status !== undefined) {
    if (data.status === null || data.status === '') {
      errors.push('status cannot be empty');
    } else if (!['Scheduled', 'Check-in', 'In-progress', 'Completed', 'Cancelled', 'No-show'].includes(data.status)) {
      errors.push('status must be one of: Scheduled, Check-in, In-progress, Completed, Cancelled, No-show');
    }
  }

  if (data.reason !== undefined && data.reason !== null && data.reason !== '') {
    if (String(data.reason).trim().length > 255) {
      errors.push('reason must be 255 characters or less');
    }
  }

  if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
    if (String(data.notes).trim().length > 500) {
      errors.push('notes must be 500 characters or less');
    }
  }

  // =========================================================================
  // RESPONSE
  // =========================================================================

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
      errors,
    };
  }

  return { valid: true };
}

// ============================================================================
// HELPER VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(String(uuid));
}

/**
 * Validate ISO datetime format
 */
function isValidDateTime(dateTime) {
  try {
    const date = new Date(dateTime);
    return date instanceof Date && !isNaN(date);
  } catch {
    return false;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  validateCreateAppointment,
  validateUpdateAppointment,
};