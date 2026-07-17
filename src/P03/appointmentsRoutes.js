// src/routes/v1/appointmentsRoutes.js
// Appointment Routes - All appointment endpoints with security middleware
// Hospital-grade route setup with proper authentication and authorization

const express = require('express');
const appointmentController = require('./appointmentController');
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

// All routes require:
// 1. Authentication (JWT token)
// 2. Hospital ID header validation
// 3. Hospital match verification

router.use(authenticateToken);            // Verify JWT token
router.use(validateHospitalHeader());      // Validate x-hospital-id header
router.use(verifyHospitalMatch());         // Verify user's hospital matches

// ============================================================================
// APPOINTMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/appointments
 * List all appointments in hospital with pagination and filters
 *
 * Query parameters:
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 * - patient_id: filter by patient UUID
 * - doctor_id: filter by doctor UUID
 * - status: filter by status (Scheduled|Check-in|In-progress|Completed|Cancelled|No-show)
 * - appointment_type: filter by type (Consultation|Follow-up|Emergency)
 * - date_from: filter from date (YYYY-MM-DD)
 * - date_to: filter to date (YYYY-MM-DD)
 *
 * Permissions required: read:appointments
 * Rate limit: Standard API limiter
 */
router.get(
  '/',
  requirePermission('appointments', 'read'),
  appointmentController.listAppointments
);

// ============================================================================

/**
 * POST /api/v1/appointments
 * Create a new appointment with automatic conflict detection
 *
 * Required body fields:
 * - patient_id (UUID)
 * - doctor_id (UUID)
 * - scheduled_start_at (ISO datetime: 2026-07-10T10:00:00Z)
 * - scheduled_end_at (ISO datetime: 2026-07-10T10:30:00Z)
 * - appointment_type (Consultation|Follow-up|Emergency)
 *
 * Optional body fields:
 * - reason (chief complaint)
 * - is_telehealth (boolean)
 *
 * Validation:
 * - Checks patient exists and is active
 * - Checks doctor exists and is available
 * - Checks doctor schedule for the date
 * - Checks for patient conflicts (double-booking)
 * - Checks for doctor conflicts (overlapping appointments)
 *
 * Permissions required: create:appointments
 * Rate limit: Sensitive operations limiter
 */
router.post(
  '/',
  sensitiveLimiter,
  requirePermission('appointments', 'create'),
  auditPermissionCheck,
  appointmentController.createAppointment
);

// ============================================================================

/**
 * GET /api/v1/appointments/:appointmentId
 * Get single appointment by ID
 *
 * Parameters:
 * - appointmentId: UUID of appointment
 *
 * Permissions required: read:appointments
 * Rate limit: Standard API limiter
 */
router.get(
  '/:appointmentId',
  requirePermission('appointments', 'read'),
  appointmentController.getAppointment
);

// ============================================================================

/**
 * PUT /api/v1/appointments/:appointmentId
 * Update appointment (status, notes, etc.)
 *
 * Parameters:
 * - appointmentId: UUID of appointment
 *
 * Optional body fields (can update any of these):
 * - status (Scheduled|Check-in|In-progress|Completed|Cancelled|No-show)
 * - reason
 * - notes
 *
 * Permissions required: update:appointments
 * Rate limit: Sensitive operations limiter
 */
router.put(
  '/:appointmentId',
  sensitiveLimiter,
  requirePermission('appointments', 'update'),
  auditPermissionCheck,
  appointmentController.updateAppointment
);

// ============================================================================

/**
 * PUT /api/v1/appointments/:appointmentId/cancel
 * Cancel appointment
 *
 * Parameters:
 * - appointmentId: UUID of appointment
 *
 * Optional body fields:
 * - reason: cancellation reason
 *
 * Can only cancel if status is Scheduled or Check-in
 *
 * Permissions required: cancel:appointments
 * Rate limit: Sensitive operations limiter
 */
router.put(
  '/:appointmentId/cancel',
  sensitiveLimiter,
  requirePermission('appointments', 'cancel'),
  auditPermissionCheck,
  appointmentController.cancelAppointment
);

// ============================================================================

/**
 * GET /api/v1/appointments/availability
 * Get available appointment slots for a doctor on a specific date
 *
 * Query parameters (REQUIRED):
 * - doctor_id: UUID of doctor
 * - date: date in YYYY-MM-DD format
 *
 * Returns:
 * - is_available: whether doctor is available on that date
 * - available_slots: array of available time slots
 * - booked_slots: array of already booked slots
 * - max_appointments_per_day: maximum appointments allowed
 * - booked_count: number of appointments already booked
 *
 * Permissions required: read:appointments
 * Rate limit: Standard API limiter
 *
 * Example: GET /api/v1/appointments/availability?doctor_id=uuid&date=2026-07-10
 */
router.get(
  '/availability',
  requirePermission('appointments', 'read'),
  appointmentController.getAvailableSlots
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for invalid appointment IDs
// FIX: Added named wildcard parameter for Express v5 compatibility
router.all('/:appointmentId/*splat', (req, res, next) => {
  const error = new Error(`Appointment endpoint not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;