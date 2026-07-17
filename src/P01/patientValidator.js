// src/validators/patientValidator.js
// Patient Validator - Input validation for patient operations
// Hospital-grade validation with detailed error messages

/**
 * Validate patient creation request
 * 
 * Required fields:
 * - medical_record_number
 * - first_name
 * - last_name
 * - date_of_birth
 * - gender
 * - phone
 */
function validateCreatePatient(data) {
  const errors = [];

  // =========================================================================
  // REQUIRED FIELDS
  // =========================================================================

  if (!data.medical_record_number || !String(data.medical_record_number).trim()) {
    errors.push('medical_record_number is required');
  } else if (String(data.medical_record_number).trim().length > 50) {
    errors.push('medical_record_number must be 50 characters or less');
  }

  if (!data.first_name || !String(data.first_name).trim()) {
    errors.push('first_name is required');
  } else if (String(data.first_name).trim().length < 2) {
    errors.push('first_name must be at least 2 characters');
  } else if (String(data.first_name).trim().length > 100) {
    errors.push('first_name must be 100 characters or less');
  }

  if (!data.last_name || !String(data.last_name).trim()) {
    errors.push('last_name is required');
  } else if (String(data.last_name).trim().length < 2) {
    errors.push('last_name must be at least 2 characters');
  } else if (String(data.last_name).trim().length > 100) {
    errors.push('last_name must be 100 characters or less');
  }

  if (!data.date_of_birth) {
    errors.push('date_of_birth is required');
  } else if (!isValidDate(data.date_of_birth)) {
    errors.push('date_of_birth must be a valid date (YYYY-MM-DD)');
  } else {
    const age = calculateAge(new Date(data.date_of_birth));
    if (age < 0) {
      errors.push('date_of_birth cannot be in the future');
    }
    if (age > 150) {
      errors.push('date_of_birth seems invalid (age > 150 years)');
    }
  }

  if (!data.gender) {
    errors.push('gender is required');
  } else if (!['Male', 'Female', 'Other'].includes(data.gender)) {
    errors.push('gender must be one of: Male, Female, Other');
  }

  if (!data.phone || !String(data.phone).trim()) {
    errors.push('phone is required');
  } else {
    const phoneDigits = String(data.phone).replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.push('phone must have at least 10 digits');
    }
    if (phoneDigits.length > 15) {
      errors.push('phone must have at most 15 digits');
    }
  }

  // =========================================================================
  // OPTIONAL FIELDS
  // =========================================================================

  if (data.email !== undefined && data.email !== null && data.email !== '') {
    if (!isValidEmail(data.email)) {
      errors.push('email must be a valid email address');
    }
  }

  if (data.blood_group !== undefined && data.blood_group !== null && data.blood_group !== '') {
    if (!isValidBloodGroup(data.blood_group)) {
      errors.push('blood_group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-');
    }
  }

  if (data.aadhar_number !== undefined && data.aadhar_number !== null && data.aadhar_number !== '') {
    const aadhaarDigits = String(data.aadhar_number).replace(/\D/g, '');
    if (aadhaarDigits.length !== 12) {
      errors.push('aadhar_number must be exactly 12 digits');
    }
  }

  if (data.pan_number !== undefined && data.pan_number !== null && data.pan_number !== '') {
    if (!isValidPAN(data.pan_number)) {
      errors.push('pan_number must be in valid format (e.g., AAAAA1234A)');
    }
  }

  if (data.address !== undefined && data.address !== null && data.address !== '') {
    if (String(data.address).trim().length > 500) {
      errors.push('address must be 500 characters or less');
    }
  }

  if (data.city !== undefined && data.city !== null && data.city !== '') {
    if (String(data.city).trim().length > 100) {
      errors.push('city must be 100 characters or less');
    }
  }

  if (data.state !== undefined && data.state !== null && data.state !== '') {
    if (String(data.state).trim().length > 100) {
      errors.push('state must be 100 characters or less');
    }
  }

  if (data.postal_code !== undefined && data.postal_code !== null && data.postal_code !== '') {
    if (String(data.postal_code).trim().length > 20) {
      errors.push('postal_code must be 20 characters or less');
    }
  }

  if (data.emergency_contact_name !== undefined && data.emergency_contact_name !== null && data.emergency_contact_name !== '') {
    if (String(data.emergency_contact_name).trim().length < 2) {
      errors.push('emergency_contact_name must be at least 2 characters');
    }
    if (String(data.emergency_contact_name).trim().length > 100) {
      errors.push('emergency_contact_name must be 100 characters or less');
    }
  }

  if (data.emergency_contact_phone !== undefined && data.emergency_contact_phone !== null && data.emergency_contact_phone !== '') {
    const phoneDigits = String(data.emergency_contact_phone).replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.push('emergency_contact_phone must have at least 10 digits');
    }
    if (phoneDigits.length > 15) {
      errors.push('emergency_contact_phone must have at most 15 digits');
    }
  }

  if (data.emergency_contact_relation !== undefined && data.emergency_contact_relation !== null && data.emergency_contact_relation !== '') {
    if (String(data.emergency_contact_relation).trim().length > 50) {
      errors.push('emergency_contact_relation must be 50 characters or less');
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
 * Validate patient update request
 * All fields are optional
 */
function validateUpdatePatient(data) {
  const errors = [];

  // =========================================================================
  // OPTIONAL FIELDS (any can be updated)
  // =========================================================================

  if (data.first_name !== undefined) {
    if (data.first_name === null || data.first_name === '') {
      errors.push('first_name cannot be empty');
    } else if (String(data.first_name).trim().length < 2) {
      errors.push('first_name must be at least 2 characters');
    } else if (String(data.first_name).trim().length > 100) {
      errors.push('first_name must be 100 characters or less');
    }
  }

  if (data.last_name !== undefined) {
    if (data.last_name === null || data.last_name === '') {
      errors.push('last_name cannot be empty');
    } else if (String(data.last_name).trim().length < 2) {
      errors.push('last_name must be at least 2 characters');
    } else if (String(data.last_name).trim().length > 100) {
      errors.push('last_name must be 100 characters or less');
    }
  }

  if (data.email !== undefined && data.email !== null && data.email !== '') {
    if (!isValidEmail(data.email)) {
      errors.push('email must be a valid email address');
    }
  }

  if (data.phone !== undefined) {
    if (data.phone === null || data.phone === '') {
      errors.push('phone cannot be empty');
    } else {
      const phoneDigits = String(data.phone).replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        errors.push('phone must have at least 10 digits');
      }
      if (phoneDigits.length > 15) {
        errors.push('phone must have at most 15 digits');
      }
    }
  }

  if (data.blood_group !== undefined && data.blood_group !== null && data.blood_group !== '') {
    if (!isValidBloodGroup(data.blood_group)) {
      errors.push('blood_group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-');
    }
  }

  if (data.address !== undefined && data.address !== null && data.address !== '') {
    if (String(data.address).trim().length > 500) {
      errors.push('address must be 500 characters or less');
    }
  }

  if (data.city !== undefined && data.city !== null && data.city !== '') {
    if (String(data.city).trim().length > 100) {
      errors.push('city must be 100 characters or less');
    }
  }

  if (data.state !== undefined && data.state !== null && data.state !== '') {
    if (String(data.state).trim().length > 100) {
      errors.push('state must be 100 characters or less');
    }
  }

  if (data.postal_code !== undefined && data.postal_code !== null && data.postal_code !== '') {
    if (String(data.postal_code).trim().length > 20) {
      errors.push('postal_code must be 20 characters or less');
    }
  }

  if (data.emergency_contact_name !== undefined && data.emergency_contact_name !== null && data.emergency_contact_name !== '') {
    if (String(data.emergency_contact_name).trim().length < 2) {
      errors.push('emergency_contact_name must be at least 2 characters');
    }
    if (String(data.emergency_contact_name).trim().length > 100) {
      errors.push('emergency_contact_name must be 100 characters or less');
    }
  }

  if (data.emergency_contact_phone !== undefined && data.emergency_contact_phone !== null && data.emergency_contact_phone !== '') {
    const phoneDigits = String(data.emergency_contact_phone).replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.push('emergency_contact_phone must have at least 10 digits');
    }
    if (phoneDigits.length > 15) {
      errors.push('emergency_contact_phone must have at most 15 digits');
    }
  }

  if (data.emergency_contact_relation !== undefined && data.emergency_contact_relation !== null && data.emergency_contact_relation !== '') {
    if (String(data.emergency_contact_relation).trim().length > 50) {
      errors.push('emergency_contact_relation must be 50 characters or less');
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
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth) {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Validate blood group
 */
function isValidBloodGroup(bloodGroup) {
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return validGroups.includes(String(bloodGroup).toUpperCase());
}

/**
 * Validate PAN number (Indian tax ID)
 * Format: AAAAA1234A (5 letters, 4 digits, 1 letter)
 */
function isValidPAN(pan) {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  return panRegex.test(String(pan).toUpperCase());
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  validateCreatePatient,
  validateUpdatePatient,
};