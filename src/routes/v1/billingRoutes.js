// src/routes/v1/billingRoutes.js
// Billing Routes - Invoice and payment management endpoints

const express = require('express');
const billingController = require('../../controllers/billingController');
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
  paymentLimiter,
} = require('../../middleware/rateLimit');

const router = express.Router();

// ============================================================================
// MIDDLEWARE CHAIN
// ============================================================================

router.use(authenticateToken);
router.use(validateHospitalHeader());
router.use(verifyHospitalMatch());

// ============================================================================
// INVOICE ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/billing/invoices
 * Create a new invoice
 *
 * Required body fields:
 * - patient_id (UUID)
 * - appointment_id (UUID)
 * - services (array of service items)
 *   - service_name (string)
 *   - quantity (number)
 *   - rate (number)
 *   - description (optional)
 *
 * Optional:
 * - discount_percent (0-100)
 * - discount_reason (string)
 * - notes (string)
 *
 * Permissions: create:invoices
 */
router.post(
  '/invoices',
  sensitiveLimiter,
  requirePermission('invoices', 'create'),
  auditPermissionCheck,
  billingController.createInvoice
);

/**
 * GET /api/v1/billing/invoices
 * Get invoices for patient
 *
 * Query parameters:
 * - patient_id (required)
 * - status (Pending|Paid|Partially Paid|Cancelled)
 *
 * Permissions: read:invoices
 */
router.get(
  '/invoices',
  requirePermission('invoices', 'read'),
  billingController.getInvoices
);

/**
 * GET /api/v1/billing/invoices/:invoiceId
 * Get specific invoice with items and payments
 *
 * Permissions: read:invoices
 */
router.get(
  '/invoices/:invoiceId',
  requirePermission('invoices', 'read'),
  billingController.getInvoice
);

/**
 * PUT /api/v1/billing/invoices/:invoiceId/cancel
 * Cancel an invoice
 *
 * Optional body fields:
 * - reason (string)
 *
 * Permissions: update:invoices
 */
router.put(
  '/invoices/:invoiceId/cancel',
  sensitiveLimiter,
  requirePermission('invoices', 'update'),
  auditPermissionCheck,
  billingController.cancelInvoice
);

// ============================================================================
// PAYMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/billing/invoices/:invoiceId/payments
 * Record a payment for invoice
 *
 * Required body fields:
 * - amount (number, > 0)
 * - payment_method (Cash|Cheque|Card|Net Banking|UPI|Insurance)
 *
 * Optional:
 * - transaction_id (for card/net banking)
 * - notes (string)
 *
 * Validates that payment doesn't exceed remaining balance
 * Automatically updates invoice status (Pending → Partially Paid → Paid)
 *
 * Permissions: create:payments
 * Rate limit: Payment limiter (5 requests/minute)
 */
router.post(
  '/invoices/:invoiceId/payments',
  paymentLimiter,
  requirePermission('payments', 'create'),
  auditPermissionCheck,
  billingController.recordPayment
);

/**
 * GET /api/v1/billing/invoices/:invoiceId/payments
 * Get all payments for an invoice
 *
 * Permissions: read:invoices
 */
router.get(
  '/invoices/:invoiceId/payments',
  requirePermission('invoices', 'read'),
  billingController.getPayments
);

// ============================================================================
// FINANCIAL REPORTING
// ============================================================================

/**
 * GET /api/v1/billing/summary
 * Get billing summary for date range
 *
 * Query parameters (REQUIRED):
 * - date_from (YYYY-MM-DD)
 * - date_to (YYYY-MM-DD)
 *
 * Returns:
 * - total_invoices: Number of invoices issued
 * - paid_count: Number of paid invoices
 * - pending_count: Number of pending invoices
 * - partially_paid_count: Number of partially paid invoices
 * - cancelled_count: Number of cancelled invoices
 * - total_amount: Total invoice amount
 * - paid_amount: Total paid amount
 * - pending_amount: Total pending amount
 *
 * Permissions: read:invoices
 */
router.get(
  '/summary',
  requirePermission('invoices', 'read'),
  billingController.getBillingSummary
);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;