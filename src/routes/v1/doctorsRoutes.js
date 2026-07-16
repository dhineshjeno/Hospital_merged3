// src/routes/v1/doctorsRoutes.js
// Doctor Routes - All doctor endpoints with security middleware
// Hospital-grade route setup with proper authentication and authorization

const express = require('express');
const doctorController = require('../../controllers/doctorController');
const {
  authenticateToken,
  verifyHospitalMatch,
} = require('../../middleware/auth');
const {
  validateHospitalHeader,
} = require('../../middleware/hospitalHeaderValidator');
const {
  requirePermission,
  auditPermissionCheck,
} = require('../../middleware/roleBasedAccess');
const {
  sensitiveLimiter,
} = require('../../middleware/rateLimit');

const router = express.Router();

// ============================================================================
// MIDDLEWARE CHAIN
// ============================================================================

// All routes require:
// 1. Authentication (JWT token)
// 2. Hospital ID header validation
// 3. Hospital match verification

router.use(authenticateToken);           // Verify JWT token
router.use(validateHospitalHeader());     // Validate x-hospital-id header
router.use(verifyHospitalMatch());        // Verify user's hospital matches

// ============================================================================
// DOCTOR ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/doctors
 * List all doctors in hospital with pagination and filters
 *
 * Query parameters:
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 * - search: search by name or employee code
 * - specialization: filter by specialization
 * - is_available: filter by availability (true/false)
 * - department_id: filter by department
 *
 * Permissions required: read:doctors
 * Rate limit: Standard API limiter
 */
router.get(
  '/',
  requirePermission('doctors', 'read'),
  doctorController.listDoctors
);

// ============================================================================

/**
 * POST /api/v1/doctors
 * Create a new doctor
 *
 * Required body fields:
 * - user_id (UUID of existing user with doctor role)
 * - employee_code (unique per hospital)
 * - specialization (medical specialty)
 * - registration_number (medical license number)
 *
 * Optional body fields:
 * - qualification (degrees, certifications)
 * - experience_years (years of experience)
 * - consultation_fee (consultation charge)
 * - department_id (department UUID)
 *
 * Permissions required: create:doctors
 * Rate limit: Sensitive operations limiter
 */
router.post(
  '/',
  sensitiveLimiter,
  requirePermission('doctors', 'create'),
  auditPermissionCheck,
  doctorController.createDoctor
);

// ============================================================================

/**
 * GET /api/v1/doctors/:doctorId
 * Get single doctor by ID
 *
 * Parameters:
 * - doctorId: UUID of doctor
 *
 * Permissions required: read:doctors
 * Rate limit: Standard API limiter
 */
router.get(
  '/:doctorId',
  requirePermission('doctors', 'read'),
  doctorController.getDoctor
);

// ============================================================================

/**
 * PUT /api/v1/doctors/:doctorId
 * Update doctor information
 *
 * Parameters:
 * - doctorId: UUID of doctor
 *
 * Optional body fields (can update any of these):
 * - specialization
 * - qualification
 * - experience_years
 * - consultation_fee
 * - is_available (true/false)
 * - department_id
 *
 * Permissions required: update:doctors
 * Rate limit: Sensitive operations limiter
 */
router.put(
  '/:doctorId',
  sensitiveLimiter,
  requirePermission('doctors', 'update'),
  auditPermissionCheck,
  doctorController.updateDoctor
);

// ============================================================================

/**
 * GET /api/v1/doctors/:doctorId/schedule
 * Get doctor's weekly schedule
 *
 * Returns:
 * - Doctor information
 * - Weekly schedule (day-wise timings)
 * - Available appointment slots
 *
 * Parameters:
 * - doctorId: UUID of doctor
 *
 * Permissions required: read:doctors
 * Rate limit: Standard API limiter
 */
router.get(
  '/:doctorId/schedule',
  requirePermission('doctors', 'read'),
  doctorController.getDoctorSchedule
);

// ============================================================================

/**
 * GET /api/v1/doctors/:doctorId/availability
 * Get doctor's availability for a specific date
 *
 * Query parameters:
 * - date: date in YYYY-MM-DD format (required)
 *
 * Returns:
 * - Available time slots
 * - Booked appointments
 * - Number of booked slots
 * - Maximum appointments per day
 *
 * Parameters:
 * - doctorId: UUID of doctor
 *
 * Permissions required: read:doctors
 * Rate limit: Standard API limiter
 */
router.get(
  '/:doctorId/availability',
  requirePermission('doctors', 'read'),
  doctorController.getDoctorAvailability
);

// ============================================================================

/**
 * PUT /api/v1/doctors/:doctorId/deactivate
 * Deactivate doctor (mark as unavailable)
 *
 * Parameters:
 * - doctorId: UUID of doctor
 *
 * Note: Marks doctor as unavailable but doesn't delete records
 *
 * Permissions required: delete:doctors
 * Rate limit: Sensitive operations limiter
 */
router.put(
  '/:doctorId/deactivate',
  sensitiveLimiter,
  requirePermission('doctors', 'delete'),
  auditPermissionCheck,
  doctorController.deactivateDoctor
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for invalid doctor IDs
// FIX: Added named wildcard parameter for Express v5 compatibility
router.all('/:doctorId/*splat', (req, res, next) => {
  const error = new Error(`Doctor endpoint not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;