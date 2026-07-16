// src/validators/wardValidator.js
// Ward Validator - Input validation for wards, rooms, and admissions

/**
 * Validate ward creation
 */
function validateCreateWard(data) {
  const errors = [];

  if (!data.name || !String(data.name).trim()) {
    errors.push('name is required');
  } else if (String(data.name).trim().length > 100) {
    errors.push('name must be 100 characters or less');
  }

  if (!data.ward_type || !String(data.ward_type).trim()) {
    errors.push('ward_type is required');
  } else {
    const validTypes = ['General', 'ICU', 'Pediatrics', 'Maternity', 'Surgery', 'Cardiology', 'Oncology', 'Neurology'];
    if (!validTypes.includes(data.ward_type.trim())) {
      errors.push(`ward_type must be one of: ${validTypes.join(', ')}`);
    }
  }

  if (!data.total_beds || parseInt(data.total_beds) <= 0) {
    errors.push('total_beds must be greater than 0');
  } else if (parseInt(data.total_beds) > 100) {
    errors.push('total_beds cannot exceed 100');
  }

  if (data.description !== undefined && data.description !== null && data.description !== '') {
    if (String(data.description).trim().length > 500) {
      errors.push('description must be 500 characters or less');
    }
  }

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
 * Validate room creation
 */
function validateCreateRoom(data) {
  const errors = [];

  if (!data.room_number || !String(data.room_number).trim()) {
    errors.push('room_number is required');
  } else if (String(data.room_number).trim().length > 20) {
    errors.push('room_number must be 20 characters or less');
  }

  if (!data.room_type || !String(data.room_type).trim()) {
    errors.push('room_type is required');
  } else {
    const validTypes = ['Single', 'Double', 'Triple', 'Quad', 'Ward'];
    if (!validTypes.includes(data.room_type.trim())) {
      errors.push(`room_type must be one of: ${validTypes.join(', ')}`);
    }
  }

  if (!data.total_beds || parseInt(data.total_beds) <= 0) {
    errors.push('total_beds must be greater than 0');
  } else if (parseInt(data.total_beds) > 10) {
    errors.push('total_beds cannot exceed 10 per room');
  }

  if (data.description !== undefined && data.description !== null && data.description !== '') {
    if (String(data.description).trim().length > 300) {
      errors.push('description must be 300 characters or less');
    }
  }

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
 * Validate admission
 */
function validateAdmission(data) {
  const errors = [];

  if (!data.patient_id) errors.push('patient_id is required');
  if (!data.bed_id) errors.push('bed_id is required');
  if (!data.doctor_id) errors.push('doctor_id is required');

  if (!data.admission_reason || !String(data.admission_reason).trim()) {
    errors.push('admission_reason is required');
  } else if (String(data.admission_reason).trim().length > 300) {
    errors.push('admission_reason must be 300 characters or less');
  }

  if (!data.admission_type || !String(data.admission_type).trim()) {
    errors.push('admission_type is required');
  } else {
    const validTypes = ['Emergency', 'Planned', 'Transfer'];
    if (!validTypes.includes(data.admission_type.trim())) {
      errors.push(`admission_type must be one of: ${validTypes.join(', ')}`);
    }
  }

  if (data.chief_complaint !== undefined && data.chief_complaint !== null && data.chief_complaint !== '') {
    if (String(data.chief_complaint).trim().length > 300) {
      errors.push('chief_complaint must be 300 characters or less');
    }
  }

  if (data.medical_history !== undefined && data.medical_history !== null && data.medical_history !== '') {
    if (String(data.medical_history).trim().length > 500) {
      errors.push('medical_history must be 500 characters or less');
    }
  }

  if (data.expected_stay_days !== undefined && data.expected_stay_days !== null) {
    const days = parseInt(data.expected_stay_days);
    if (isNaN(days) || days <= 0) {
      errors.push('expected_stay_days must be greater than 0');
    } else if (days > 365) {
      errors.push('expected_stay_days cannot exceed 365 days');
    }
  }

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
// EXPORT
// ============================================================================

module.exports = {
  validateCreateWard,
  validateCreateRoom,
  validateAdmission,
};