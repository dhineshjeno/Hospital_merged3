// src/controllers/ehrController.js
// EHR Controller - Electronic Health Records
// Handles consultations, vitals, diagnoses with HIPAA compliance

const ehrRepository = require('../repositories/ehrRepository');
const consultationRepository = require('../repositories/consultationRepository');
const vitalRepository = require('../repositories/vitalRepository');
const diagnosisRepository = require('../repositories/diagnosisRepository');
const patientRepository = require('../repositories/patientRepository');
const { 
  validateCreateConsultation, 
  validateUpdateConsultation 
} = require('../validators/ehrValidator');
const ApiError = require('../utils/ApiError');
const auditLogger = require('../utils/auditLogger');
const { catchAsync } = require('../middleware/errorHandler');

// ============================================================================
// CONSULTATION CONTROLLER
// ============================================================================

/**
 * Create a new consultation
 * POST /api/v1/ehr/consultations
 * 
 * Required fields:
 * - patient_id
 * - doctor_id
 * - appointment_id
 * - chief_complaint
 */
const createConsultation = catchAsync(async (req, res, next) => {
  try {
    // =========================================================================
    // 1. VALIDATE INPUT
    // =========================================================================

    const validation = validateCreateConsultation(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const {
      patient_id,
      doctor_id,
      appointment_id,
      chief_complaint,
      history_of_present_illness,
      past_medical_history,
      past_surgical_history,
      family_history,
      social_history,
      physical_examination,
      assessment,
      plan,
      notes,
    } = req.body;

    const hospitalId = req.hospitalId;

    // =========================================================================
    // 2. VERIFY PATIENT EXISTS
    // =========================================================================

    const patient = await patientRepository.findById(hospitalId, patient_id);
    if (!patient) {
      throw ApiError.patientNotFound(hospitalId, patient_id);
    }

    // =========================================================================
    // 3. CREATE CONSULTATION
    // =========================================================================

    const consultationData = {
      hospital_id: hospitalId,
      patient_id,
      doctor_id,
      appointment_id,
      chief_complaint: chief_complaint.trim(),
      history_of_present_illness: history_of_present_illness ? history_of_present_illness.trim() : null,
      past_medical_history: past_medical_history ? past_medical_history.trim() : null,
      past_surgical_history: past_surgical_history ? past_surgical_history.trim() : null,
      family_history: family_history ? family_history.trim() : null,
      social_history: social_history ? social_history.trim() : null,
      physical_examination: physical_examination ? physical_examination.trim() : null,
      assessment: assessment ? assessment.trim() : null,
      plan: plan ? plan.trim() : null,
      notes: notes ? notes.trim() : null,
    };

    const newConsultation = await consultationRepository.create(consultationData);

    // =========================================================================
    // 4. AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'consultation',
      resource_id: newConsultation.consultation_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          consultation_id: newConsultation.consultation_id,
          patient_id,
          chief_complaint,
        },
      },
    });

    // =========================================================================
    // 5. RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Consultation created successfully',
      data: newConsultation,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get consultations for a patient
 * GET /api/v1/ehr/consultations?patient_id=UUID
 */
const getConsultations = catchAsync(async (req, res, next) => {
  try {
    const { patient_id } = req.query;
    const hospitalId = req.hospitalId;

    if (!patient_id) {
      throw ApiError.badRequest('patient_id is required');
    }

    // =========================================================================
    // FETCH CONSULTATIONS
    // =========================================================================

    const consultations = await consultationRepository.findByPatient(
      hospitalId,
      patient_id
    );

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      data: consultations,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Update consultation
 * PUT /api/v1/ehr/consultations/:consultationId
 */
const updateConsultation = catchAsync(async (req, res, next) => {
  try {
    const { consultationId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(consultationId)) {
      throw ApiError.badRequest('Invalid consultation ID format');
    }

    const validation = validateUpdateConsultation(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    // =========================================================================
    // GET CURRENT CONSULTATION
    // =========================================================================

    const currentConsultation = await consultationRepository.findById(hospitalId, consultationId);
    if (!currentConsultation) {
      throw ApiError.notFound('Consultation not found');
    }

    // =========================================================================
    // BUILD UPDATE DATA
    // =========================================================================

    const updateData = {};
    const changeLog = {};

    const updatableFields = [
      'assessment',
      'plan',
      'physical_examination',
      'notes',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        const newValue = req.body[field] ? req.body[field].trim() : null;
        if (newValue !== currentConsultation[field]) {
          updateData[field] = newValue;
          changeLog[field] = 'updated';
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.json({
        success: true,
        message: 'No changes made',
        data: currentConsultation,
      });
    }

    // =========================================================================
    // UPDATE CONSULTATION
    // =========================================================================

    const updatedConsultation = await consultationRepository.update(
      hospitalId,
      consultationId,
      updateData
    );

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'consultation',
      resource_id: consultationId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: changeLog,
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      message: 'Consultation updated successfully',
      data: updatedConsultation,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// VITALS CONTROLLER
// ============================================================================

/**
 * Record patient vitals
 * POST /api/v1/ehr/vitals
 * 
 * Required fields:
 * - patient_id
 * - At least one vital reading
 */
const recordVitals = catchAsync(async (req, res, next) => {
  try {
    const {
      patient_id,
      consultation_id,
      temperature_celsius,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate_bpm,
      respiratory_rate_breaths_per_min,
      oxygen_saturation_percent,
      blood_glucose_mg_dl,
      weight_kg,
      height_cm,
    } = req.body;

    const hospitalId = req.hospitalId;

    // =========================================================================
    // VALIDATION
    // =========================================================================

    if (!patient_id) {
      throw ApiError.badRequest('patient_id is required');
    }

    // Validate vital ranges
    if (temperature_celsius !== undefined && temperature_celsius !== null) {
      if (temperature_celsius < 35 || temperature_celsius > 42) {
        throw ApiError.badRequest('Temperature must be between 35°C and 42°C');
      }
    }

    if (heart_rate_bpm !== undefined && heart_rate_bpm !== null) {
      if (heart_rate_bpm < 20 || heart_rate_bpm > 200) {
        throw ApiError.badRequest('Heart rate must be between 20 and 200 bpm');
      }
    }

    if (blood_pressure_systolic !== undefined && blood_pressure_diastolic !== undefined) {
      if (blood_pressure_systolic < 60 || blood_pressure_systolic > 250) {
        throw ApiError.badRequest('Systolic BP must be between 60 and 250');
      }
      if (blood_pressure_diastolic < 30 || blood_pressure_diastolic > 150) {
        throw ApiError.badRequest('Diastolic BP must be between 30 and 150');
      }
    }

    if (oxygen_saturation_percent !== undefined && oxygen_saturation_percent !== null) {
      if (oxygen_saturation_percent < 50 || oxygen_saturation_percent > 100) {
        throw ApiError.badRequest('O2 saturation must be between 50% and 100%');
      }
    }

    // =========================================================================
    // CREATE VITAL RECORD
    // =========================================================================

    const vitalData = {
      hospital_id: hospitalId,
      patient_id,
      consultation_id: consultation_id || null,
      temperature_celsius: temperature_celsius || null,
      blood_pressure_systolic: blood_pressure_systolic || null,
      blood_pressure_diastolic: blood_pressure_diastolic || null,
      heart_rate_bpm: heart_rate_bpm || null,
      respiratory_rate_breaths_per_min: respiratory_rate_breaths_per_min || null,
      oxygen_saturation_percent: oxygen_saturation_percent || null,
      blood_glucose_mg_dl: blood_glucose_mg_dl || null,
      weight_kg: weight_kg || null,
      height_cm: height_cm || null,
      recorded_by_id: req.user.userId,
    };

    const newVital = await vitalRepository.create(vitalData);

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'vital',
      resource_id: newVital.vital_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          vital_id: newVital.vital_id,
          patient_id,
          temperature: temperature_celsius,
          heart_rate: heart_rate_bpm,
        },
      },
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Vitals recorded successfully',
      data: newVital,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get patient vitals
 * GET /api/v1/ehr/vitals?patient_id=UUID&limit=10
 */
const getVitals = catchAsync(async (req, res, next) => {
  try {
    const { patient_id, limit = 20 } = req.query;
    const hospitalId = req.hospitalId;

    if (!patient_id) {
      throw ApiError.badRequest('patient_id is required');
    }

    const vitals = await vitalRepository.findByPatient(
      hospitalId,
      patient_id,
      Math.min(parseInt(limit) || 20, 100)
    );

    res.json({
      success: true,
      data: vitals,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DIAGNOSIS CONTROLLER
// ============================================================================

/**
 * Add diagnosis to consultation
 * POST /api/v1/ehr/diagnoses
 * 
 * Required fields:
 * - consultation_id
 * - patient_id
 * - icd_code (ICD-10 code)
 * - diagnosis_name
 */
const addDiagnosis = catchAsync(async (req, res, next) => {
  try {
    const {
      consultation_id,
      patient_id,
      icd_code,
      diagnosis_name,
      is_primary,
      severity,
      onset_date,
      notes,
    } = req.body;

    const hospitalId = req.hospitalId;

    // =========================================================================
    // VALIDATION
    // =========================================================================

    if (!consultation_id || !patient_id || !icd_code || !diagnosis_name) {
      throw ApiError.badRequest('consultation_id, patient_id, icd_code, and diagnosis_name are required');
    }

    if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(icd_code)) {
      throw ApiError.badRequest('icd_code must be valid ICD-10 format (e.g., A01.0)');
    }

    // =========================================================================
    // CREATE DIAGNOSIS
    // =========================================================================

    const diagnosisData = {
      hospital_id: hospitalId,
      consultation_id,
      patient_id,
      icd_code: icd_code.toUpperCase(),
      diagnosis_name: diagnosis_name.trim(),
      is_primary: is_primary !== undefined ? is_primary : true,
      severity: severity || 'Mild',
      status: 'Active',
      onset_date: onset_date || null,
      notes: notes ? notes.trim() : null,
    };

    const newDiagnosis = await diagnosisRepository.create(diagnosisData);

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'diagnosis',
      resource_id: newDiagnosis.diagnosis_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          diagnosis_id: newDiagnosis.diagnosis_id,
          icd_code,
          diagnosis_name,
        },
      },
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Diagnosis added successfully',
      data: newDiagnosis,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get diagnoses for a consultation
 * GET /api/v1/ehr/diagnoses?consultation_id=UUID
 */
const getDiagnoses = catchAsync(async (req, res, next) => {
  try {
    const { consultation_id } = req.query;
    const hospitalId = req.hospitalId;

    if (!consultation_id) {
      throw ApiError.badRequest('consultation_id is required');
    }

    const diagnoses = await diagnosisRepository.findByConsultation(
      hospitalId,
      consultation_id
    );

    res.json({
      success: true,
      data: diagnoses,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  createConsultation,
  getConsultations,
  updateConsultation,
  recordVitals,
  getVitals,
  addDiagnosis,
  getDiagnoses,
};