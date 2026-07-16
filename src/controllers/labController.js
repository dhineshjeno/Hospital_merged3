// src/controllers/labController.js
// Lab Controller - Lab test orders and results management
// Handles lab test orders, sample collection, and result reporting

const labOrderRepository = require('../repositories/labOrderRepository');
const labResultRepository = require('../repositories/labResultRepository');
const patientRepository = require('../repositories/patientRepository');
const { validateCreateLabOrder, validateLabResult } = require('../validators/labValidator');
const ApiError = require('../utils/ApiError');
const auditLogger = require('../utils/auditLogger');
const { catchAsync } = require('../middleware/errorHandler');

// ============================================================================
// LAB ORDER CONTROLLER
// ============================================================================

/**
 * Create a new lab test order
 * POST /api/v1/lab/orders
 * 
 * Required fields:
 * - patient_id
 * - doctor_id
 * - test_codes (array of test codes)
 */
const createLabOrder = catchAsync(async (req, res, next) => {
  try {
    // =========================================================================
    // 1. VALIDATE INPUT
    // =========================================================================

    const validation = validateCreateLabOrder(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const {
      patient_id,
      doctor_id,
      test_codes,
      consultation_id,
      urgency,
      clinical_notes,
    } = req.body;

    const hospitalId = req.hospitalId;

    // =========================================================================
    // 2. VERIFY PATIENT
    // =========================================================================

    const patient = await patientRepository.findById(hospitalId, patient_id);
    if (!patient) {
      throw ApiError.patientNotFound(hospitalId, patient_id);
    }

    // =========================================================================
    // 3. CREATE LAB ORDER
    // =========================================================================

    const orderData = {
      hospital_id: hospitalId,
      patient_id,
      doctor_id,
      consultation_id: consultation_id || null,
      test_codes: test_codes.join(','),
      urgency: urgency || 'Routine',
      clinical_notes: clinical_notes ? clinical_notes.trim() : null,
      status: 'Pending',
      ordered_at: new Date(),
      ordered_by_id: req.user.userId,
    };

    const newOrder = await labOrderRepository.create(orderData);

    // =========================================================================
    // 4. AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'lab_order',
      resource_id: newOrder.lab_order_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          lab_order_id: newOrder.lab_order_id,
          patient_id,
          test_count: test_codes.length,
        },
      },
    });

    // =========================================================================
    // 5. RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Lab order created successfully',
      data: {
        ...newOrder,
        test_codes: test_codes,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get lab orders for patient
 * GET /api/v1/lab/orders?patient_id=UUID
 */
const getLabOrders = catchAsync(async (req, res, next) => {
  try {
    const { patient_id, status } = req.query;
    const hospitalId = req.hospitalId;

    let orders;
    if (patient_id) {
      orders = await labOrderRepository.findByPatient(
        hospitalId,
        patient_id,
        status || null
      );
    } else {
      orders = await labOrderRepository.findByHospital(
        hospitalId,
        status || null
      );
    }

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get single lab order with results
 * GET /api/v1/lab/orders/:orderId
 */
const getLabOrder = catchAsync(async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      throw ApiError.badRequest('Invalid order ID format');
    }

    const order = await labOrderRepository.getWithResults(hospitalId, orderId);
    if (!order) {
      throw ApiError.notFound('Lab order not found');
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Update lab order status (e.g., mark sample collected)
 * PUT /api/v1/lab/orders/:orderId
 */
const updateLabOrder = catchAsync(async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      throw ApiError.badRequest('Invalid order ID format');
    }

    const validStatuses = ['Pending', 'Sample Collected', 'Processing', 'Completed', 'Cancelled'];
    if (status && !validStatuses.includes(status)) {
      throw ApiError.badRequest(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await labOrderRepository.findById(hospitalId, orderId);
    if (!order) {
      throw ApiError.notFound('Lab order not found');
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes.trim();

    const updatedOrder = await labOrderRepository.update(hospitalId, orderId, updateData);

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'lab_order',
      resource_id: orderId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: { status: status || null },
    });

    res.json({
      success: true,
      message: 'Lab order updated successfully',
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// LAB RESULT CONTROLLER
// ============================================================================

/**
 * Add lab test result
 * POST /api/v1/lab/orders/:orderId/results
 */
const addLabResult = catchAsync(async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const {
      test_code,
      test_name,
      result_value,
      unit,
      reference_range,
      abnormality_flag,
      notes,
    } = req.body;

    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      throw ApiError.badRequest('Invalid order ID format');
    }

    const validation = validateLabResult(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const order = await labOrderRepository.findById(hospitalId, orderId);
    if (!order) {
      throw ApiError.notFound('Lab order not found');
    }

    const resultData = {
      hospital_id: hospitalId,
      lab_order_id: orderId,
      test_code: test_code.trim(),
      test_name: test_name.trim(),
      result_value: result_value.trim(),
      unit: unit ? unit.trim() : null,
      reference_range: reference_range ? reference_range.trim() : null,
      abnormality_flag: abnormality_flag || false,
      notes: notes ? notes.trim() : null,
      reported_at: new Date(),
      reported_by_id: req.user.userId,
    };

    const newResult = await labResultRepository.create(resultData);

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'lab_result',
      resource_id: newResult.lab_result_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          lab_result_id: newResult.lab_result_id,
          test_code,
          abnormality_flag,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Lab result added successfully',
      data: newResult,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get lab results for an order
 * GET /api/v1/lab/orders/:orderId/results
 */
const getLabResults = catchAsync(async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      throw ApiError.badRequest('Invalid order ID format');
    }

    const results = await labResultRepository.findByOrder(hospitalId, orderId);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get abnormal results for patient
 * GET /api/v1/lab/abnormal?patient_id=UUID
 */
const getAbnormalResults = catchAsync(async (req, res, next) => {
  try {
    const { patient_id } = req.query;
    const hospitalId = req.hospitalId;

    if (!patient_id) {
      throw ApiError.badRequest('patient_id is required');
    }

    const results = await labResultRepository.getAbnormalForPatient(hospitalId, patient_id);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  createLabOrder,
  getLabOrders,
  getLabOrder,
  updateLabOrder,
  addLabResult,
  getLabResults,
  getAbnormalResults,
};