// src/controllers/billingController.js
// Billing Controller - Invoice and payment management
// Handles invoicing, payment tracking, and financial reports

const invoiceRepository = require('./invoiceRepository');
const invoiceItemRepository = require('./invoiceItemRepository');
const paymentRepository = require('./paymentRepository');
const appointmentRepository = require('../P03/appointmentRepository');
const patientRepository = require('../P01/patientRepository');
const { validateCreateInvoice, validatePayment } = require('./billingValidator');
const ApiError = require('../utils/ApiError');
const auditLogger = require('../utils/auditLogger');
const { catchAsync } = require('../middleware/errorHandler');

// ============================================================================
// INVOICE CONTROLLER
// ============================================================================

/**
 * Create a new invoice
 * POST /api/v1/billing/invoices
 * 
 * Required fields:
 * - patient_id
 * - appointment_id
 * - services (array of service items)
 */
const createInvoice = catchAsync(async (req, res, next) => {
  try {
    // =========================================================================
    // 1. VALIDATE INPUT
    // =========================================================================

    const validation = validateCreateInvoice(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const {
      patient_id,
      appointment_id,
      services,
      discount_percent,
      discount_reason,
      notes,
    } = req.body;

    const hospitalId = req.hospitalId;

    // =========================================================================
    // 2. VERIFY PATIENT AND APPOINTMENT
    // =========================================================================

    const patient = await patientRepository.findById(hospitalId, patient_id);
    if (!patient) {
      throw ApiError.patientNotFound(hospitalId, patient_id);
    }

    const appointment = await appointmentRepository.findById(hospitalId, appointment_id);
    if (!appointment) {
      throw ApiError.notFound('Appointment not found');
    }

    if (appointment.patient_id !== patient_id) {
      throw ApiError.badRequest('Appointment does not belong to patient');
    }

    // =========================================================================
    // 3. CALCULATE TOTALS
    // =========================================================================

    let subtotal = 0;
    services.forEach((service) => {
      subtotal += service.quantity * service.rate;
    });

    const discountAmount = (subtotal * (discount_percent || 0)) / 100;
    const taxAmount = (subtotal - discountAmount) * 0.18; // 18% GST
    const total = subtotal - discountAmount + taxAmount;

    // =========================================================================
    // 4. CREATE INVOICE
    // =========================================================================

    const invoiceData = {
      hospital_id: hospitalId,
      patient_id,
      appointment_id,
      invoice_number: `INV-${Date.now()}`,
      subtotal,
      discount_percent: discount_percent || 0,
      discount_amount: discountAmount,
      discount_reason: discount_reason || null,
      tax_amount: taxAmount,
      total_amount: total,
      status: 'Pending',
      notes: notes ? notes.trim() : null,
      issued_at: new Date(),
      issued_by_id: req.user.userId,
    };

    const newInvoice = await invoiceRepository.create(invoiceData);

    // =========================================================================
    // 5. CREATE INVOICE ITEMS
    // =========================================================================

    for (const service of services) {
      await invoiceItemRepository.create({
        hospital_id: hospitalId,
        invoice_id: newInvoice.invoice_id,
        service_name: service.service_name,
        description: service.description || null,
        quantity: service.quantity,
        rate: service.rate,
        amount: service.quantity * service.rate,
      });
    }

    // =========================================================================
    // 6. AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'invoice',
      resource_id: newInvoice.invoice_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          invoice_id: newInvoice.invoice_id,
          invoice_number: newInvoice.invoice_number,
          total_amount: total,
          patient_id,
        },
      },
    });

    // =========================================================================
    // 7. RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        ...newInvoice,
        items: services,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get invoices for patient
 * GET /api/v1/billing/invoices?patient_id=UUID&status=Pending
 */
const getInvoices = catchAsync(async (req, res, next) => {
  try {
    const { patient_id, status } = req.query;
    const hospitalId = req.hospitalId;

    if (!patient_id) {
      throw ApiError.badRequest('patient_id is required');
    }

    const invoices = await invoiceRepository.findByPatient(
      hospitalId,
      patient_id,
      status || null
    );

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get single invoice with items
 * GET /api/v1/billing/invoices/:invoiceId
 */
const getInvoice = catchAsync(async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invoiceId)) {
      throw ApiError.badRequest('Invalid invoice ID format');
    }

    const invoice = await invoiceRepository.getWithItems(hospitalId, invoiceId);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found');
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Record payment for invoice
 * POST /api/v1/billing/invoices/:invoiceId/payments
 */
const recordPayment = catchAsync(async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { amount, payment_method, transaction_id, notes } = req.body;
    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invoiceId)) {
      throw ApiError.badRequest('Invalid invoice ID format');
    }

    const validation = validatePayment(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    // =========================================================================
    // VERIFY INVOICE
    // =========================================================================

    const invoice = await invoiceRepository.findById(hospitalId, invoiceId);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found');
    }

    if (invoice.status === 'Cancelled') {
      throw ApiError.conflict('Cannot record payment for cancelled invoice');
    }

    // =========================================================================
    // CALCULATE REMAINING AMOUNT
    // =========================================================================

    const payments = await paymentRepository.findByInvoice(hospitalId, invoiceId);
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = invoice.total_amount - paidAmount;

    if (amount > remainingAmount) {
      throw ApiError.badRequest(
        `Payment amount (${amount}) exceeds remaining balance (${remainingAmount})`
      );
    }

    // =========================================================================
    // CREATE PAYMENT
    // =========================================================================

    const paymentData = {
      hospital_id: hospitalId,
      invoice_id: invoiceId,
      amount,
      payment_method: payment_method.trim(),
      transaction_id: transaction_id ? transaction_id.trim() : null,
      notes: notes ? notes.trim() : null,
      status: 'Completed',
      received_at: new Date(),
      received_by_id: req.user.userId,
    };

    const newPayment = await paymentRepository.create(paymentData);

    // =========================================================================
    // UPDATE INVOICE STATUS IF FULLY PAID
    // =========================================================================

    if (paidAmount + amount >= invoice.total_amount) {
      await invoiceRepository.update(hospitalId, invoiceId, {
        status: 'Paid',
        paid_at: new Date(),
      });
    } else if (paidAmount + amount > 0) {
      await invoiceRepository.update(hospitalId, invoiceId, {
        status: 'Partially Paid',
      });
    }

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'payment',
      resource_id: newPayment.payment_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          payment_id: newPayment.payment_id,
          amount,
          payment_method,
          invoice_id: invoiceId,
        },
      },
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment: newPayment,
        invoice_status: paidAmount + amount >= invoice.total_amount ? 'Paid' : 'Partially Paid',
        amount_paid: paidAmount + amount,
        amount_remaining: remainingAmount - amount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get payments for invoice
 * GET /api/v1/billing/invoices/:invoiceId/payments
 */
const getPayments = catchAsync(async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invoiceId)) {
      throw ApiError.badRequest('Invalid invoice ID format');
    }

    const payments = await paymentRepository.findByInvoice(hospitalId, invoiceId);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get billing summary for date range
 * GET /api/v1/billing/summary?date_from=2026-07-01&date_to=2026-07-31
 */
const getBillingSummary = catchAsync(async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    const hospitalId = req.hospitalId;

    if (!date_from || !date_to) {
      throw ApiError.badRequest('date_from and date_to are required (YYYY-MM-DD format)');
    }

    const summary = await invoiceRepository.getSummary(
      hospitalId,
      date_from,
      date_to
    );

    res.json({
      success: true,
      data: {
        period: {
          from: date_from,
          to: date_to,
        },
        ...summary,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Cancel invoice
 * PUT /api/v1/billing/invoices/:invoiceId/cancel
 */
const cancelInvoice = catchAsync(async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { reason } = req.body;
    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invoiceId)) {
      throw ApiError.badRequest('Invalid invoice ID format');
    }

    const invoice = await invoiceRepository.findById(hospitalId, invoiceId);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found');
    }

    if (invoice.status === 'Cancelled') {
      throw ApiError.conflict('Invoice is already cancelled');
    }

    const updatedInvoice = await invoiceRepository.update(hospitalId, invoiceId, {
      status: 'Cancelled',
      notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
      cancelled_at: new Date(),
      cancelled_by_id: req.user.userId,
    });

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'invoice',
      resource_id: invoiceId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        status: {
          old: invoice.status,
          new: 'Cancelled',
        },
      },
    });

    res.json({
      success: true,
      message: 'Invoice cancelled successfully',
      data: updatedInvoice,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  recordPayment,
  getPayments,
  getBillingSummary,
  cancelInvoice,
};
