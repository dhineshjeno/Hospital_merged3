// src/validators/labValidator.js
// Lab Validator - Input validation for lab tests

/**
 * Validate lab order creation
 */
function validateCreateLabOrder(data) {
  const errors = [];

  if (!data.patient_id) errors.push('patient_id is required');
  if (!data.doctor_id) errors.push('doctor_id is required');

  if (!data.test_codes || !Array.isArray(data.test_codes) || data.test_codes.length === 0) {
    errors.push('test_codes must be a non-empty array');
  } else {
    const validCodes = [
      'CBC', 'TLC', 'DLC', 'Hb', // Hematology
      'BMP', 'LFT', 'RFT', 'Glucose', // Chemistry
      'TSH', 'T3', 'T4', // Endocrinology
      'Lipid Panel', 'Cholesterol', // Lipids
      'Blood Culture', 'Urine Culture', // Microbiology
      'COVID-19 PCR', 'Influenza PCR', // Virology
    ];

    const invalidCodes = data.test_codes.filter((code) => !validCodes.includes(code));
    if (invalidCodes.length > 0) {
      errors.push(`Invalid test codes: ${invalidCodes.join(', ')}`);
    }
  }

  if (data.urgency !== undefined && data.urgency !== null) {
    if (!['Routine', 'Urgent', 'Stat'].includes(data.urgency)) {
      errors.push('urgency must be one of: Routine, Urgent, Stat');
    }
  }

  if (data.clinical_notes !== undefined && data.clinical_notes !== null && data.clinical_notes !== '') {
    if (String(data.clinical_notes).trim().length > 500) {
      errors.push('clinical_notes must be 500 characters or less');
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
 * Validate lab result
 */
function validateLabResult(data) {
  const errors = [];

  if (!data.test_code || !String(data.test_code).trim()) {
    errors.push('test_code is required');
  } else if (String(data.test_code).trim().length > 50) {
    errors.push('test_code must be 50 characters or less');
  }

  if (!data.test_name || !String(data.test_name).trim()) {
    errors.push('test_name is required');
  } else if (String(data.test_name).trim().length > 100) {
    errors.push('test_name must be 100 characters or less');
  }

  if (!data.result_value || !String(data.result_value).trim()) {
    errors.push('result_value is required');
  } else if (String(data.result_value).trim().length > 50) {
    errors.push('result_value must be 50 characters or less');
  }

  if (data.unit !== undefined && data.unit !== null && data.unit !== '') {
    if (String(data.unit).trim().length > 30) {
      errors.push('unit must be 30 characters or less');
    }
  }

  if (data.reference_range !== undefined && data.reference_range !== null && data.reference_range !== '') {
    if (String(data.reference_range).trim().length > 100) {
      errors.push('reference_range must be 100 characters or less');
    }
  }

  if (data.abnormality_flag !== undefined && typeof data.abnormality_flag !== 'boolean') {
    errors.push('abnormality_flag must be a boolean');
  }

  if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
    if (String(data.notes).trim().length > 300) {
      errors.push('notes must be 300 characters or less');
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
  validateCreateLabOrder,
  validateLabResult,
};