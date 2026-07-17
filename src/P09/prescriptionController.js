// src/controllers/prescriptionController.js
// Prescription Controller - Prescription management
// Handles prescription creation, dispensing, and tracking

const prescriptionRepository = require('./prescriptionRepository');
const prescriptionItemRepository = require('./prescriptionItemRepository');
const consultationRepository = require('../P08/consultationRepository');
const patientRepository = require('../P01/patientRepository');
const { validateCreatePrescription, validatePrescriptionItem } = require('./prescriptionValidator');
const ApiError = require('../utils/ApiError');
const auditLogger = require('../utils/auditLogger');
const { catchAsync } = require('../middleware/errorHandler');

// ============================================================================
// PRESCRIPTION CONTROLLER
// ============================================================================

/**
 * Create a new prescription
 * POST /api/v1/prescriptions
 * 
 * Required fields:
 * - patient_id
 * - doctor_id
 * - consultation_id
 * - instructions (overall prescription instructions)
 */
const createPrescription = catchAsync(async (req, res, next) => {
  try {
    // =========================================================================
    // 1. VALIDATE INPUT
    // =========================================================================

    const validation = validateCreatePrescription(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const {
      patient_id,
      doctor_id,
      consultation_id,
      instructions,
      notes,
      valid_until,
    } = req.body;

    const hospitalId = req.hospitalId;

    // =========================================================================
    // 2. VERIFY PATIENT AND CONSULTATION
    // =========================================================================

    const patient = await patientRepository.findById(hospitalId, patient_id);
    if (!patient) {
      throw ApiError.patientNotFound(hospitalId, patient_id);
    }

    const consultation = await consultationRepository.findById(hospitalId, consultation_id);
    if (!consultation) {
      throw ApiError.notFound('Consultation not found');
    }

    // =========================================================================
    // 3. CREATE PRESCRIPTION
    // =========================================================================

    const prescriptionData = {
      hospital_id: hospitalId,
      patient_id,
      doctor_id,
      consultation_id,
      instructions: instructions.trim(),
      notes: notes ? notes.trim() : null,
      status: 'Active',
      valid_until: valid_until || null,
      issued_at: new Date(),
    };

    const newPrescription = await prescriptionRepository.create(prescriptionData);

    // =========================================================================
    // 4. AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'prescription',
      resource_id: newPrescription.prescription_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          prescription_id: newPrescription.prescription_id,
          patient_id,
          issued_at: new Date(),
        },
      },
    });

    // =========================================================================
    // 5. RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: newPrescription,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get prescriptions for patient
 * GET /api/v1/prescriptions?patient_id=UUID&status=Active
 */
const getPrescriptions = catchAsync(async (req, res, next) => {
  try {
    const { patient_id, status } = req.query;
    const hospitalId = req.hospitalId;

    if (!patient_id) {
      throw ApiError.badRequest('patient_id is required');
    }

    const prescriptions = await prescriptionRepository.findByPatient(
      hospitalId,
      patient_id,
      status || null
    );

    res.json({
      success: true,
      data: prescriptions,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get single prescription with items
 * GET /api/v1/prescriptions/:prescriptionId
 */
const getPrescription = catchAsync(async (req, res, next) => {
  try {
    const { prescriptionId } = req.params;
    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(prescriptionId)) {
      throw ApiError.badRequest('Invalid prescription ID format');
    }

    const prescription = await prescriptionRepository.getWithItems(hospitalId, prescriptionId);
    if (!prescription) {
      throw ApiError.notFound('Prescription not found');
    }

    res.json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Add medicine item to prescription
 * POST /api/v1/prescriptions/:prescriptionId/items
 */
const addPrescriptionItem = catchAsync(async (req, res, next) => {
  try {
    const { prescriptionId } = req.params;
    const {
      medicine_id,
      medicine_name,
      dosage,
      unit,
      frequency,
      duration_days,
      quantity,
      instructions,
      side_effects,
    } = req.body;

    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(prescriptionId)) {
      throw ApiError.badRequest('Invalid prescription ID format');
    }

    // Validate input
    const validation = validatePrescriptionItem(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    // =========================================================================
    // VERIFY PRESCRIPTION
    // =========================================================================

    const prescription = await prescriptionRepository.findById(hospitalId, prescriptionId);
    if (!prescription) {
      throw ApiError.notFound('Prescription not found');
    }

    // =========================================================================
    // CREATE PRESCRIPTION ITEM
    // =========================================================================

    const itemData = {
      hospital_id: hospitalId,
      prescription_id: prescriptionId,
      medicine_id: medicine_id || null,
      medicine_name: medicine_name.trim(),
      dosage: dosage.trim(),
      unit: unit.trim(),
      frequency: frequency.trim(),
      duration_days: parseInt(duration_days),
      quantity: parseInt(quantity),
      instructions: instructions ? instructions.trim() : null,
      side_effects: side_effects ? side_effects.trim() : null,
      status: 'Pending',
    };

    const newItem = await prescriptionItemRepository.create(itemData);

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'prescription_item',
      resource_id: newItem.prescription_item_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          prescription_item_id: newItem.prescription_item_id,
          medicine_name,
          dosage,
        },
      },
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Prescription item added successfully',
      data: newItem,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Dispense prescription item
 * PUT /api/v1/prescriptions/:prescriptionId/items/:itemId/dispense
 */
const dispensePrescriptionItem = catchAsync(async (req, res, next) => {
  try {
    const { prescriptionId, itemId } = req.params;
    const { quantity_dispensed, expiry_date, batch_number } = req.body;

    const hospitalId = req.hospitalId;

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(prescriptionId) || !uuidRegex.test(itemId)) {
      throw ApiError.badRequest('Invalid ID format');
    }

    if (!quantity_dispensed || quantity_dispensed <= 0) {
      throw ApiError.badRequest('quantity_dispensed must be greater than 0');
    }

    // =========================================================================
    // GET PRESCRIPTION ITEM
    // =========================================================================

    const item = await prescriptionItemRepository.findById(hospitalId, itemId);
    if (!item || item.prescription_id !== prescriptionId) {
      throw ApiError.notFound('Prescription item not found');
    }

    if (item.status !== 'Pending') {
      throw ApiError.conflict('Item can only be dispensed from Pending status');
    }

    // =========================================================================
    // UPDATE ITEM STATUS
    // =========================================================================

    const dispensedItem = await prescriptionItemRepository.update(
      hospitalId,
      itemId,
      {
        status: 'Dispensed',
        quantity_dispensed,
        expiry_date: expiry_date || null,
        batch_number: batch_number || null,
        dispensed_at: new Date(),
        dispensed_by_id: req.user.userId,
      }
    );

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'prescription_item',
      resource_id: itemId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        status: {
          old: 'Pending',
          new: 'Dispensed',
        },
        quantity_dispensed,
      },
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      message: 'Prescription item dispensed successfully',
      data: dispensedItem,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Expire prescription
 * PUT /api/v1/prescriptions/:prescriptionId/expire
 */
const expirePrescription = catchAsync(async (req, res, next) => {
  try {
    const { prescriptionId } = req.params;
    const { reason } = req.body;

    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(prescriptionId)) {
      throw ApiError.badRequest('Invalid prescription ID format');
    }

    const prescription = await prescriptionRepository.findById(hospitalId, prescriptionId);
    if (!prescription) {
      throw ApiError.notFound('Prescription not found');
    }

    const updatedPrescription = await prescriptionRepository.update(
      hospitalId,
      prescriptionId,
      {
        status: 'Expired',
        notes: reason ? `Expired: ${reason}` : 'Expired',
      }
    );

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'prescription',
      resource_id: prescriptionId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        status: {
          old: prescription.status,
          new: 'Expired',
        },
      },
    });

    res.json({
      success: true,
      message: 'Prescription expired',
      data: updatedPrescription,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  createPrescription,
  getPrescriptions,
  getPrescription,
  addPrescriptionItem,
  dispensePrescriptionItem,
  expirePrescription,
};
