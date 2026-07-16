// src/routes/v1/prescriptionsRoutes.js
// Prescription Routes - Prescription management endpoints

const express = require('express');
const prescriptionController = require('../../controllers/prescriptionController');
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
// PRESCRIPTION ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/prescriptions
 * Create a new prescription
 *
 * Required body fields:
 * - patient_id (UUID)
 * - doctor_id (UUID)
 * - consultation_id (UUID)
 * - instructions (string)
 *
 * Optional:
 * - notes
 * - valid_until (date)
 *
 * Permissions: create:prescriptions
 */
router.post(
  '/',
  sensitiveLimiter,
  requirePermission('prescriptions', 'create'),
  auditPermissionCheck,
  prescriptionController.createPrescription
);

/**
 * GET /api/v1/prescriptions
 * Get prescriptions for patient
 *
 * Query parameters:
 * - patient_id (required)
 * - status (Active|Expired)
 *
 * Permissions: read:prescriptions
 */
router.get(
  '/',
  requirePermission('prescriptions', 'read'),
  prescriptionController.getPrescriptions
);

/**
 * GET /api/v1/prescriptions/:prescriptionId
 * Get prescription with all items
 *
 * Permissions: read:prescriptions
 */
router.get(
  '/:prescriptionId',
  requirePermission('prescriptions', 'read'),
  prescriptionController.getPrescription
);

/**
 * POST /api/v1/prescriptions/:prescriptionId/items
 * Add medicine item to prescription
 *
 * Required body fields:
 * - medicine_name
 * - dosage (e.g., "500")
 * - unit (mg|g|ml|tablet|capsule|injection|drops|spray|ointment|lotion)
 * - frequency (Once daily|Twice daily|etc)
 * - duration_days
 * - quantity
 *
 * Optional:
 * - medicine_id (UUID)
 * - instructions
 * - side_effects
 *
 * Permissions: create:prescriptions
 */
router.post(
  '/:prescriptionId/items',
  sensitiveLimiter,
  requirePermission('prescriptions', 'create'),
  auditPermissionCheck,
  prescriptionController.addPrescriptionItem
);

/**
 * PUT /api/v1/prescriptions/:prescriptionId/items/:itemId/dispense
 * Dispense a medicine item
 *
 * Required body fields:
 * - quantity_dispensed (number)
 *
 * Optional:
 * - expiry_date (YYYY-MM-DD)
 * - batch_number (string)
 *
 * Permissions: dispense:prescriptions
 */
router.put(
  '/:prescriptionId/items/:itemId/dispense',
  sensitiveLimiter,
  requirePermission('prescriptions', 'dispense'),
  auditPermissionCheck,
  prescriptionController.dispensePrescriptionItem
);

/**
 * PUT /api/v1/prescriptions/:prescriptionId/expire
 * Expire a prescription
 *
 * Optional body fields:
 * - reason (string)
 *
 * Permissions: update:prescriptions
 */
router.put(
  '/:prescriptionId/expire',
  sensitiveLimiter,
  requirePermission('prescriptions', 'update'),
  auditPermissionCheck,
  prescriptionController.expirePrescription
);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;