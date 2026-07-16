// src/routes/v1/wardRoutes.js
// Ward Routes - Ward, room, bed, and admission management endpoints

const express = require('express');
const wardController = require('../../controllers/wardController');
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

router.use(authenticateToken);
router.use(validateHospitalHeader());
router.use(verifyHospitalMatch());

// ============================================================================
// WARD ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/wards
 * Create a new ward
 *
 * Required body fields:
 * - name (string)
 * - ward_type (General|ICU|Pediatrics|Maternity|Surgery|Cardiology|Oncology|Neurology)
 * - total_beds (1-100)
 *
 * Optional:
 * - description (string)
 *
 * Permissions: create:wards
 */
router.post(
  '/',
  sensitiveLimiter,
  requirePermission('wards', 'create'),
  auditPermissionCheck,
  wardController.createWard
);

/**
 * GET /api/v1/wards
 * Get all wards in hospital
 *
 * Permissions: read:wards
 */
router.get(
  '/',
  requirePermission('wards', 'read'),
  wardController.getWards
);

// ============================================================================
// ROOM ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/wards/:wardId/rooms
 * Create a new room in a ward
 *
 * Required body fields:
 * - room_number (string)
 * - room_type (Single|Double|Triple|Quad|Ward)
 * - total_beds (1-10)
 *
 * Optional:
 * - description (string)
 *
 * Permissions: create:wards
 */
router.post(
  '/:wardId/rooms',
  sensitiveLimiter,
  requirePermission('wards', 'create'),
  auditPermissionCheck,
  wardController.createRoom
);

/**
 * GET /api/v1/wards/:wardId/rooms
 * Get all rooms in a ward
 *
 * Permissions: read:wards
 */
router.get(
  '/:wardId/rooms',
  requirePermission('wards', 'read'),
  wardController.getRooms
);

// ============================================================================
// BED ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/wards/:wardId/rooms/:roomId/beds
 * Create a bed in a room
 *
 * Required body fields:
 * - bed_number (string)
 *
 * Permissions: create:wards
 */
router.post(
  '/:wardId/rooms/:roomId/beds',
  sensitiveLimiter,
  requirePermission('wards', 'create'),
  auditPermissionCheck,
  wardController.createBed
);

/**
 * GET /api/v1/wards/:wardId/rooms/:roomId/beds
 * Get all beds in a room
 *
 * Permissions: read:wards
 */
router.get(
  '/:wardId/rooms/:roomId/beds',
  requirePermission('wards', 'read'),
  wardController.getBeds
);

// ============================================================================
// ADMISSION ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/admissions
 * Admit a patient to a bed
 *
 * Required body fields:
 * - patient_id (UUID)
 * - bed_id (UUID)
 * - doctor_id (UUID)
 * - admission_reason (string)
 * - admission_type (Emergency|Planned|Transfer)
 *
 * Optional:
 * - chief_complaint (string)
 * - medical_history (string)
 * - expected_stay_days (number)
 *
 * Automatically:
 * - Marks bed as Occupied
 * - Updates room available beds
 * - Creates admission record
 *
 * Permissions: create:admissions
 */
router.post(
  '/admissions',
  sensitiveLimiter,
  requirePermission('admissions', 'create'),
  auditPermissionCheck,
  wardController.admitPatient
);

/**
 * GET /api/v1/admissions
 * Get patient admissions
 *
 * Query parameters:
 * - patient_id (required)
 * - status (Active|Discharged)
 *
 * Permissions: read:admissions
 */
router.get(
  '/admissions',
  requirePermission('admissions', 'read'),
  wardController.getAdmissions
);

/**
 * PUT /api/v1/admissions/:admissionId/discharge
 * Discharge a patient
 *
 * Optional body fields:
 * - discharge_reason (string)
 * - notes (string)
 *
 * Automatically:
 * - Marks bed as Available
 * - Updates room available beds
 * - Updates admission status
 *
 * Permissions: update:admissions
 */
router.put(
  '/admissions/:admissionId/discharge',
  sensitiveLimiter,
  requirePermission('admissions', 'update'),
  auditPermissionCheck,
  wardController.dischargePatient
);

/**
 * PUT /api/v1/admissions/:admissionId/transfer
 * Transfer patient to different bed
 *
 * Required body fields:
 * - new_bed_id (UUID)
 *
 * Optional:
 * - transfer_reason (string)
 *
 * Automatically:
 * - Frees old bed
 * - Occupies new bed
 * - Updates room available beds
 * - Updates admission record
 *
 * Permissions: update:admissions
 */
router.put(
  '/admissions/:admissionId/transfer',
  sensitiveLimiter,
  requirePermission('admissions', 'update'),
  auditPermissionCheck,
  wardController.transferPatient
);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;