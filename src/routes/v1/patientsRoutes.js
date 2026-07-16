// src/routes/v1/patientsRoutes.js
// Patient Routes - All patient endpoints with security middleware
// Hospital-grade route setup with proper authentication and authorization

const express = require('express');
const patientController = require('../../controllers/patientController');
const { 
  authenticateToken, 
  verifyHospitalMatch 
} = require('../../middleware/auth');
const { 
  validateHospitalHeader 
} = require('../../middleware/hospitalHeaderValidator');
const { 
  requirePermission 
} = require('../../middleware/roleBasedAccess');
const { 
  sensitiveLimiter, 
  paymentLimiter 
} = require('../../middleware/rateLimit');
const { 
  auditPermissionCheck 
} = require('../../middleware/roleBasedAccess');

const router = express.Router();

// ============================================================================
// MIDDLEWARE CHAIN
// ============================================================================

// All routes require:
// 1. Authentication (JWT token)
// 2. Hospital ID header validation
// 3. Hospital match verification
// 4. Rate limiting for sensitive operations

router.use(authenticateToken);          // Verify JWT token
router.use(validateHospitalHeader());    // Validate x-hospital-id header
router.use(verifyHospitalMatch());       // Verify user's hospital matches

// ============================================================================
// PATIENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/patients
 * List all patients in hospital with pagination and filters
 * 
 * Query parameters:
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 * - search: search by name, MRN, or phone
 * - is_active: filter by active status (true/false)
 * - gender: filter by gender
 * - blood_group: filter by blood group
 * 
 * Permissions required: read:patients
 * Rate limit: Standard API limiter
 */
router.get(
  '/',
  requirePermission('patients', 'read'),
  patientController.listPatients
);

// ============================================================================

/**
 * POST /api/v1/patients
 * Create a new patient
 * 
 * Required body fields:
 * - medical_record_number
 * - first_name
 * - last_name
 * - date_of_birth (YYYY-MM-DD)
 * - gender (Male|Female|Other)
 * - phone
 * 
 * Optional body fields:
 * - email
 * - blood_group (A+|A-|B+|B-|AB+|AB-|O+|O-)
 * - aadhar_number (will be encrypted)
 * - pan_number (will be encrypted)
 * - address, city, state, postal_code
 * - emergency_contact_name, emergency_contact_phone, emergency_contact_relation
 * 
 * Permissions required: create:patients
 * Rate limit: Sensitive operations limiter
 */
router.post(
  '/',
  sensitiveLimiter,
  requirePermission('patients', 'create'),
  auditPermissionCheck,
  patientController.createPatient
);

// ============================================================================

/**
 * GET /api/v1/patients/:patientId
 * Get single patient by ID
 * 
 * Parameters:
 * - patientId: UUID of patient
 * 
 * Permissions required: read:patients
 * Rate limit: Standard API limiter
 */
router.get(
  '/:patientId',
  requirePermission('patients', 'read'),
  patientController.getPatient
);

// ============================================================================

/**
 * PUT /api/v1/patients/:patientId
 * Update patient information
 * 
 * Parameters:
 * - patientId: UUID of patient
 * 
 * Optional body fields (can update any of these):
 * - first_name, last_name
 * - email, phone
 * - blood_group
 * - address, city, state, postal_code
 * - emergency_contact_name, emergency_contact_phone, emergency_contact_relation
 * 
 * Permissions required: update:patients
 * Rate limit: Sensitive operations limiter
 */
router.put(
  '/:patientId',
  sensitiveLimiter,
  requirePermission('patients', 'update'),
  auditPermissionCheck,
  patientController.updatePatient
);

// ============================================================================

/**
 * DELETE /api/v1/patients/:patientId
 * Soft delete patient (mark as inactive)
 * 
 * Parameters:
 * - patientId: UUID of patient
 * 
 * Note: Does not actually delete data, just marks as inactive
 * HIPAA compliance: keeps data for audit trails
 * 
 * Permissions required: delete:patients
 * Rate limit: Sensitive operations limiter
 */
router.delete(
  '/:patientId',
  sensitiveLimiter,
  requirePermission('patients', 'delete'),
  auditPermissionCheck,
  patientController.deletePatient
);

// ============================================================================

/**
 * GET /api/v1/patients/:patientId/full-record
 * Get patient with full medical history
 * 
 * Returns:
 * - Patient basic info
 * - Allergies
 * - Recent consultations (last 10)
 * - Active prescriptions
 * - Recent vitals (last 5)
 * 
 * Parameters:
 * - patientId: UUID of patient
 * 
 * Permissions required: read:patients
 * Rate limit: Sensitive operations limiter (more data = higher sensitivity)
 */
router.get(
  '/:patientId/full-record',
  sensitiveLimiter,
  requirePermission('patients', 'read'),
  patientController.getPatientFullRecord
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for invalid patient IDs
// FIX: Added named wildcard parameter for Express v5 compatibility
// Changed from: router.all('/:patientId/*', ...)
// Changed to: router.all('/:patientId/*splat', ...)
router.all('/:patientId/*splat', (req, res, next) => {
  const error = new Error(`Patient endpoint not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;