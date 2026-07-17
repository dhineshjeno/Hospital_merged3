// src/validators/ehrValidator.js
// EHR Validator - Input validation for consultations, vitals, and diagnoses
// Hospital-grade validation with medical standards

/**
 * Validate consultation creation
 */
function validateCreateConsultation(data) {
  const errors = [];

  // Required fields
  if (!data.patient_id) errors.push('patient_id is required');
  if (!data.doctor_id) errors.push('doctor_id is required');
  if (!data.appointment_id) errors.push('appointment_id is required');
  if (!data.chief_complaint || !String(data.chief_complaint).trim()) {
    errors.push('chief_complaint is required');
  } else if (String(data.chief_complaint).trim().length > 500) {
    errors.push('chief_complaint must be 500 characters or less');
  }

  // Optional field length validations
  const textFields = [
    'history_of_present_illness',
    'past_medical_history',
    'past_surgical_history',
    'family_history',
    'social_history',
    'physical_examination',
    'assessment',
    'plan',
    'notes',
  ];

  textFields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      if (String(data[field]).trim().length > 2000) {
        errors.push(`${field} must be 2000 characters or less`);
      }
    }
  });

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
 * Validate consultation update
 */
function validateUpdateConsultation(data) {
  const errors = [];

  const textFields = [
    'assessment',
    'plan',
    'physical_examination',
    'notes',
  ];

  textFields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      if (String(data[field]).trim().length > 2000) {
        errors.push(`${field} must be 2000 characters or less`);
      }
    }
  });

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
 * Validate vital signs
 */
function validateVitals(data) {
  const errors = [];

  if (!data.patient_id) {
    errors.push('patient_id is required');
  }

  // Temperature validation
  if (data.temperature_celsius !== undefined && data.temperature_celsius !== null) {
    const temp = parseFloat(data.temperature_celsius);
    if (isNaN(temp)) {
      errors.push('temperature_celsius must be a number');
    } else if (temp < 35 || temp > 42) {
      errors.push('Temperature must be between 35°C and 42°C');
    }
  }

  // Blood pressure validation
  if (data.blood_pressure_systolic !== undefined && data.blood_pressure_systolic !== null) {
    const sys = parseInt(data.blood_pressure_systolic);
    if (isNaN(sys) || sys < 60 || sys > 250) {
      errors.push('Systolic BP must be between 60 and 250 mmHg');
    }
  }

  if (data.blood_pressure_diastolic !== undefined && data.blood_pressure_diastolic !== null) {
    const dias = parseInt(data.blood_pressure_diastolic);
    if (isNaN(dias) || dias < 30 || dias > 150) {
      errors.push('Diastolic BP must be between 30 and 150 mmHg');
    }
  }

  // Heart rate validation
  if (data.heart_rate_bpm !== undefined && data.heart_rate_bpm !== null) {
    const hr = parseInt(data.heart_rate_bpm);
    if (isNaN(hr) || hr < 20 || hr > 200) {
      errors.push('Heart rate must be between 20 and 200 bpm');
    }
  }

  // Respiratory rate validation
  if (data.respiratory_rate_breaths_per_min !== undefined && data.respiratory_rate_breaths_per_min !== null) {
    const rr = parseInt(data.respiratory_rate_breaths_per_min);
    if (isNaN(rr) || rr < 5 || rr > 50) {
      errors.push('Respiratory rate must be between 5 and 50 breaths/min');
    }
  }

  // Oxygen saturation validation
  if (data.oxygen_saturation_percent !== undefined && data.oxygen_saturation_percent !== null) {
    const spo2 = parseFloat(data.oxygen_saturation_percent);
    if (isNaN(spo2) || spo2 < 50 || spo2 > 100) {
      errors.push('O2 saturation must be between 50% and 100%');
    }
  }

  // Blood glucose validation
  if (data.blood_glucose_mg_dl !== undefined && data.blood_glucose_mg_dl !== null) {
    const glucose = parseFloat(data.blood_glucose_mg_dl);
    if (isNaN(glucose) || glucose < 20 || glucose > 600) {
      errors.push('Blood glucose must be between 20 and 600 mg/dL');
    }
  }

  // Weight validation
  if (data.weight_kg !== undefined && data.weight_kg !== null) {
    const weight = parseFloat(data.weight_kg);
    if (isNaN(weight) || weight < 1 || weight > 300) {
      errors.push('Weight must be between 1 and 300 kg');
    }
  }

  // Height validation
  if (data.height_cm !== undefined && data.height_cm !== null) {
    const height = parseFloat(data.height_cm);
    if (isNaN(height) || height < 50 || height > 250) {
      errors.push('Height must be between 50 and 250 cm');
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
 * Validate diagnosis
 */
function validateDiagnosis(data) {
  const errors = [];

  if (!data.consultation_id) errors.push('consultation_id is required');
  if (!data.patient_id) errors.push('patient_id is required');

  if (!data.icd_code || !String(data.icd_code).trim()) {
    errors.push('icd_code is required');
  } else if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(String(data.icd_code).trim())) {
    errors.push('icd_code must be valid ICD-10 format (e.g., A01.0)');
  }

  if (!data.diagnosis_name || !String(data.diagnosis_name).trim()) {
    errors.push('diagnosis_name is required');
  } else if (String(data.diagnosis_name).trim().length > 255) {
    errors.push('diagnosis_name must be 255 characters or less');
  }

  if (data.severity !== undefined && data.severity !== null) {
    if (!['Mild', 'Moderate', 'Severe'].includes(data.severity)) {
      errors.push('severity must be one of: Mild, Moderate, Severe');
    }
  }

  if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
    if (String(data.notes).trim().length > 500) {
      errors.push('notes must be 500 characters or less');
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
  validateCreateConsultation,
  validateUpdateConsultation,
  validateVitals,
  validateDiagnosis,
};