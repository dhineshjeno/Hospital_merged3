// ============================================================================
// FILE 1: FIXED_ehrRoutes.js
// ============================================================================

// src/routes/v1/ehrRoutes.js
// EHR Routes - Electronic Health Records endpoints
// Hospital-grade route setup with authentication and authorization

const express = require('express');
const ehrController = require('./ehrController');
const {
  authenticateToken,
  verifyHospitalMatch,
} = require('../middleware/auth');
const {
  validateHospitalHeader,
} = require('../middleware/hospitalHeaderValidator');
const {
  requirePermission,
  auditPermissionCheck,
} = require('../middleware/roleBasedAccess');
const {
  sensitiveLimiter,
} = require('../middleware/rateLimit');

const router = express.Router();

// ============================================================================
// MIDDLEWARE CHAIN
// ============================================================================

router.use(authenticateToken);            // Verify JWT token
router.use(validateHospitalHeader());      // Validate x-hospital-id header
router.use(verifyHospitalMatch());         // Verify user's hospital matches

// ============================================================================
// CONSULTATION ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/ehr/consultations
 * Create a new consultation
 *
 * Required body fields:
 * - patient_id (UUID)
 * - doctor_id (UUID)
 * - appointment_id (UUID)
 * - chief_complaint (string)
 *
 * Optional body fields:
 * - history_of_present_illness
 * - past_medical_history
 * - past_surgical_history
 * - family_history
 * - social_history
 * - physical_examination
 * - assessment
 * - plan
 * - notes
 *
 * Permissions required: create:consultations
 * Rate limit: Sensitive operations
 */
router.post(
  '/consultations',
  sensitiveLimiter,
  requirePermission('consultations', 'create'),
  auditPermissionCheck,
  ehrController.createConsultation
);

/**
 * GET /api/v1/ehr/consultations
 * Get consultations for a patient
 *
 * Query parameters:
 * - patient_id (UUID, required)
 *
 * Permissions required: read:consultations
 */
router.get(
  '/consultations',
  requirePermission('consultations', 'read'),
  ehrController.getConsultations
);

/**
 * PUT /api/v1/ehr/consultations/:consultationId
 * Update consultation
 *
 * Can update: assessment, plan, physical_examination, notes
 *
 * Permissions required: update:consultations
 * Rate limit: Sensitive operations
 */
router.put(
  '/consultations/:consultationId',
  sensitiveLimiter,
  requirePermission('consultations', 'update'),
  auditPermissionCheck,
  ehrController.updateConsultation
);

// ============================================================================
// VITALS ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/ehr/vitals
 * Record patient vitals
 *
 * Required body fields:
 * - patient_id (UUID)
 * - At least one vital reading
 *
 * Optional body fields:
 * - consultation_id
 * - temperature_celsius (35-42)
 * - blood_pressure_systolic/diastolic (60-250 / 30-150)
 * - heart_rate_bpm (20-200)
 * - respiratory_rate_breaths_per_min (5-50)
 * - oxygen_saturation_percent (50-100)
 * - blood_glucose_mg_dl (20-600)
 * - weight_kg (1-300)
 * - height_cm (50-250)
 *
 * Permissions required: create:vitals
 * Rate limit: Sensitive operations
 */
router.post(
  '/vitals',
  sensitiveLimiter,
  requirePermission('vitals', 'create'),
  auditPermissionCheck,
  ehrController.recordVitals
);

/**
 * GET /api/v1/ehr/vitals
 * Get patient vitals
 *
 * Query parameters:
 * - patient_id (UUID, required)
 * - limit (default: 20, max: 100)
 *
 * Permissions required: read:vitals
 */
router.get(
  '/vitals',
  requirePermission('vitals', 'read'),
  ehrController.getVitals
);

// ============================================================================
// DIAGNOSIS ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/ehr/diagnoses
 * Add diagnosis to consultation
 *
 * Required body fields:
 * - consultation_id (UUID)
 * - patient_id (UUID)
 * - icd_code (ICD-10 code, e.g., A01.0)
 * - diagnosis_name (string)
 *
 * Optional body fields:
 * - is_primary (boolean)
 * - severity (Mild|Moderate|Severe)
 * - onset_date (YYYY-MM-DD)
 * - notes
 *
 * Permissions required: create:diagnoses
 * Rate limit: Sensitive operations
 */
router.post(
  '/diagnoses',
  sensitiveLimiter,
  requirePermission('diagnoses', 'create'),
  auditPermissionCheck,
  ehrController.addDiagnosis
);

/**
 * GET /api/v1/ehr/diagnoses
 * Get diagnoses for a consultation
 *
 * Query parameters:
 * - consultation_id (UUID, required)
 *
 * Permissions required: read:diagnoses
 */
router.get(
  '/diagnoses',
  requirePermission('diagnoses', 'read'),
  ehrController.getDiagnoses
);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;