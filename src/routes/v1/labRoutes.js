// src/routes/v1/labRoutes.js
// Lab Routes - Lab test management endpoints

const express = require('express');
const labController = require('../../controllers/labController');
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
// LAB ORDER ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/lab/orders
 * Create a new lab test order
 *
 * Required body fields:
 * - patient_id (UUID)
 * - doctor_id (UUID)
 * - test_codes (array of test codes)
 *
 * Optional:
 * - consultation_id (UUID)
 * - urgency (Routine|Urgent|Stat)
 * - clinical_notes (string)
 *
 * Permissions: create:lab_tests
 */
router.post(
  '/orders',
  sensitiveLimiter,
  requirePermission('lab_orders', 'create'),
  auditPermissionCheck,
  labController.createLabOrder
);

/**
 * GET /api/v1/lab/orders
 * Get lab orders for patient
 *
 * Query parameters:
 * - patient_id (required)
 * - status (Pending|Sample Collected|Processing|Completed|Cancelled)
 *
 * Permissions: read:lab_tests
 */
router.get(
  '/orders',
  requirePermission('lab_orders', 'read'),
  labController.getLabOrders
);

/**
 * GET /api/v1/lab/orders/:orderId
 * Get specific lab order with results
 *
 * Permissions: read:lab_tests
 */
router.get(
  '/orders/:orderId',
  requirePermission('lab_orders', 'read'),
  labController.getLabOrder
);

/**
 * PUT /api/v1/lab/orders/:orderId
 * Update lab order status
 *
 * Optional body fields:
 * - status (Pending|Sample Collected|Processing|Completed|Cancelled)
 * - notes (string)
 *
 * Permissions: update:lab_tests
 */
router.put(
  '/orders/:orderId',
  sensitiveLimiter,
  requirePermission('lab_orders', 'update'),
  auditPermissionCheck,
  labController.updateLabOrder
);

// ============================================================================
// LAB RESULT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/lab/orders/:orderId/results
 * Add lab test result
 *
 * Required body fields:
 * - test_code (string)
 * - test_name (string)
 * - result_value (string)
 *
 * Optional:
 * - unit (string)
 * - reference_range (string)
 * - abnormality_flag (boolean)
 * - notes (string)
 *
 * Permissions: create:lab_tests
 */
router.post(
  '/orders/:orderId/results',
  sensitiveLimiter,
  requirePermission('lab_results', 'create'),
  auditPermissionCheck,
  labController.addLabResult
);

/**
 * GET /api/v1/lab/orders/:orderId/results
 * Get all results for a lab order
 *
 * Permissions: read:lab_tests
 */
router.get(
  '/orders/:orderId/results',
  requirePermission('lab_results', 'read'),
  labController.getLabResults
);

/**
 * GET /api/v1/lab/abnormal
 * Get abnormal results for patient
 *
 * Query parameters:
 * - patient_id (required)
 *
 * Permissions: read:lab_tests
 */
router.get(
  '/abnormal',
  requirePermission('lab_results', 'read'),
  labController.getAbnormalResults
);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;