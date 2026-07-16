// src/validators/prescriptionValidator.js
// Prescription Validator - Input validation for prescriptions

/**
 * Validate prescription creation
 */
function validateCreatePrescription(data) {
  const errors = [];

  if (!data.patient_id) errors.push('patient_id is required');
  if (!data.doctor_id) errors.push('doctor_id is required');
  if (!data.consultation_id) errors.push('consultation_id is required');

  if (!data.instructions || !String(data.instructions).trim()) {
    errors.push('instructions is required');
  } else if (String(data.instructions).trim().length > 500) {
    errors.push('instructions must be 500 characters or less');
  }

  if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
    if (String(data.notes).trim().length > 500) {
      errors.push('notes must be 500 characters or less');
    }
  }

  if (data.valid_until !== undefined && data.valid_until !== null) {
    const date = new Date(data.valid_until);
    if (isNaN(date.getTime())) {
      errors.push('valid_until must be a valid date');
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
 * Validate prescription item
 */
function validatePrescriptionItem(data) {
  const errors = [];

  if (!data.medicine_name || !String(data.medicine_name).trim()) {
    errors.push('medicine_name is required');
  } else if (String(data.medicine_name).trim().length > 100) {
    errors.push('medicine_name must be 100 characters or less');
  }

  if (!data.dosage || !String(data.dosage).trim()) {
    errors.push('dosage is required');
  } else if (String(data.dosage).trim().length > 50) {
    errors.push('dosage must be 50 characters or less');
  }

  if (!data.unit || !String(data.unit).trim()) {
    errors.push('unit is required');
  } else {
    const validUnits = ['mg', 'g', 'ml', 'tablet', 'capsule', 'injection', 'drops', 'spray', 'ointment', 'lotion'];
    if (!validUnits.includes(String(data.unit).toLowerCase())) {
      errors.push(`unit must be one of: ${validUnits.join(', ')}`);
    }
  }

  if (!data.frequency || !String(data.frequency).trim()) {
    errors.push('frequency is required');
  } else {
    const validFrequencies = ['Once daily', 'Twice daily', 'Thrice daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'As needed'];
    if (!validFrequencies.includes(String(data.frequency).trim())) {
      errors.push(`frequency must be one of: ${validFrequencies.join(', ')}`);
    }
  }

  if (!data.duration_days || parseInt(data.duration_days) <= 0) {
    errors.push('duration_days must be greater than 0');
  } else if (parseInt(data.duration_days) > 365) {
    errors.push('duration_days cannot exceed 365 days');
  }

  if (!data.quantity || parseInt(data.quantity) <= 0) {
    errors.push('quantity must be greater than 0');
  } else if (parseInt(data.quantity) > 10000) {
    errors.push('quantity seems invalid (> 10000)');
  }

  if (data.instructions !== undefined && data.instructions !== null && data.instructions !== '') {
    if (String(data.instructions).trim().length > 200) {
      errors.push('instructions must be 200 characters or less');
    }
  }

  if (data.side_effects !== undefined && data.side_effects !== null && data.side_effects !== '') {
    if (String(data.side_effects).trim().length > 300) {
      errors.push('side_effects must be 300 characters or less');
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
  validateCreatePrescription,
  validatePrescriptionItem,
};