// src/validators/doctorValidator.js
// Doctor Validator - Input validation for doctor operations
// Hospital-grade validation with detailed error messages

/**
 * Validate doctor creation request
 * 
 * Required fields:
 * - user_id (UUID)
 * - employee_code (unique per hospital)
 * - specialization
 * - registration_number (medical license)
 */
function validateCreateDoctor(data) {
  const errors = [];

  // =========================================================================
  // REQUIRED FIELDS
  // =========================================================================

  if (!data.user_id || !String(data.user_id).trim()) {
    errors.push('user_id is required');
  } else if (!isValidUUID(data.user_id)) {
    errors.push('user_id must be a valid UUID');
  }

  if (!data.employee_code || !String(data.employee_code).trim()) {
    errors.push('employee_code is required');
  } else if (String(data.employee_code).trim().length < 2) {
    errors.push('employee_code must be at least 2 characters');
  } else if (String(data.employee_code).trim().length > 50) {
    errors.push('employee_code must be 50 characters or less');
  }

  if (!data.specialization || !String(data.specialization).trim()) {
    errors.push('specialization is required');
  } else if (String(data.specialization).trim().length < 2) {
    errors.push('specialization must be at least 2 characters');
  } else if (String(data.specialization).trim().length > 100) {
    errors.push('specialization must be 100 characters or less');
  } else if (!isValidSpecialization(data.specialization)) {
    errors.push('specialization must be a valid medical specialty');
  }

  if (!data.registration_number || !String(data.registration_number).trim()) {
    errors.push('registration_number is required');
  } else if (String(data.registration_number).trim().length < 3) {
    errors.push('registration_number must be at least 3 characters');
  } else if (String(data.registration_number).trim().length > 100) {
    errors.push('registration_number must be 100 characters or less');
  }

  // =========================================================================
  // OPTIONAL FIELDS
  // =========================================================================

  if (data.qualification !== undefined && data.qualification !== null && data.qualification !== '') {
    if (String(data.qualification).trim().length > 255) {
      errors.push('qualification must be 255 characters or less');
    }
  }

  if (data.experience_years !== undefined && data.experience_years !== null && data.experience_years !== '') {
    const years = parseInt(data.experience_years);
    if (isNaN(years)) {
      errors.push('experience_years must be a number');
    } else if (years < 0) {
      errors.push('experience_years cannot be negative');
    } else if (years > 80) {
      errors.push('experience_years seems invalid (> 80 years)');
    }
  }

  if (data.consultation_fee !== undefined && data.consultation_fee !== null && data.consultation_fee !== '') {
    const fee = parseFloat(data.consultation_fee);
    if (isNaN(fee)) {
      errors.push('consultation_fee must be a number');
    } else if (fee < 0) {
      errors.push('consultation_fee cannot be negative');
    } else if (fee > 1000000) {
      errors.push('consultation_fee seems invalid (> 1000000)');
    }
  }

  if (data.department_id !== undefined && data.department_id !== null && data.department_id !== '') {
    if (!isValidUUID(data.department_id)) {
      errors.push('department_id must be a valid UUID');
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
 * Validate doctor update request
 * All fields are optional
 */
function validateUpdateDoctor(data) {
  const errors = [];

  // =========================================================================
  // OPTIONAL FIELDS (any can be updated)
  // =========================================================================

  if (data.specialization !== undefined) {
    if (data.specialization === null || data.specialization === '') {
      errors.push('specialization cannot be empty');
    } else if (String(data.specialization).trim().length < 2) {
      errors.push('specialization must be at least 2 characters');
    } else if (String(data.specialization).trim().length > 100) {
      errors.push('specialization must be 100 characters or less');
    } else if (!isValidSpecialization(data.specialization)) {
      errors.push('specialization must be a valid medical specialty');
    }
  }

  if (data.qualification !== undefined && data.qualification !== null && data.qualification !== '') {
    if (String(data.qualification).trim().length > 255) {
      errors.push('qualification must be 255 characters or less');
    }
  }

  if (data.experience_years !== undefined) {
    if (data.experience_years === null || data.experience_years === '') {
      errors.push('experience_years cannot be empty');
    } else {
      const years = parseInt(data.experience_years);
      if (isNaN(years)) {
        errors.push('experience_years must be a number');
      } else if (years < 0) {
        errors.push('experience_years cannot be negative');
      } else if (years > 80) {
        errors.push('experience_years seems invalid (> 80 years)');
      }
    }
  }

  if (data.consultation_fee !== undefined && data.consultation_fee !== null && data.consultation_fee !== '') {
    const fee = parseFloat(data.consultation_fee);
    if (isNaN(fee)) {
      errors.push('consultation_fee must be a number');
    } else if (fee < 0) {
      errors.push('consultation_fee cannot be negative');
    } else if (fee > 1000000) {
      errors.push('consultation_fee seems invalid (> 1000000)');
    }
  }

  if (data.is_available !== undefined) {
    if (typeof data.is_available !== 'boolean') {
      errors.push('is_available must be a boolean (true/false)');
    }
  }

  if (data.department_id !== undefined && data.department_id !== null && data.department_id !== '') {
    if (!isValidUUID(data.department_id)) {
      errors.push('department_id must be a valid UUID');
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
 * Validate medical specialization
 */
function isValidSpecialization(specialization) {
  const validSpecializations = [
    'General Medicine',
    'Surgery',
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Dermatology',
    'Ophthalmology',
    'Otolaryngology',
    'Gynecology',
    'Urology',
    'Oncology',
    'Radiology',
    'Pathology',
    'Anesthesiology',
    'Emergency Medicine',
    'Internal Medicine',
    'Gastroenterology',
    'Pulmonology',
    'Nephrology',
    'Endocrinology',
    'Rheumatology',
    'Hematology',
    'Infectious Diseases',
    'Physical Medicine',
    'Rehabilitation',
    'Dentistry',
    'Pharmacy',
    'Nursing',
    'Physiotherapy',
  ];

  const spec = String(specialization).trim();
  return validSpecializations.some((s) => s.toLowerCase() === spec.toLowerCase());
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  validateCreateDoctor,
  validateUpdateDoctor,
};