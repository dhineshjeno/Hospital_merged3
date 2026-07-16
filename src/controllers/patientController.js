// src/controllers/patientController.js
// Patient Controller - HTTP request handlers
// Handles all patient-related operations with full validation and error handling

const patientRepository = require('../repositories/patientRepository');
const { validateCreatePatient, validateUpdatePatient } = require('../validators/patientValidator');
const ApiError = require('../utils/ApiError');
const auditLogger = require('../utils/auditLogger');
const { catchAsync } = require('../middleware/errorHandler');

// ============================================================================
// PATIENT CONTROLLER
// ============================================================================

/**
 * Create a new patient
 * POST /api/v1/patients
 * 
 * Required fields:
 * - medical_record_number (unique per hospital)
 * - first_name
 * - last_name
 * - date_of_birth
 * - gender
 * - phone
 */
const createPatient = catchAsync(async (req, res, next) => {
  try {
    // =========================================================================
    // 1. VALIDATE INPUT
    // =========================================================================

    const validation = validateCreatePatient(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const { 
      medical_record_number, 
      first_name, 
      last_name, 
      date_of_birth, 
      gender, 
      phone,
      email,
      blood_group,
      aadhar_number,
      pan_number,
      address,
      city,
      state,
      postal_code,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
    } = req.body;

    const hospitalId = req.hospitalId;

    // =========================================================================
    // 2. CHECK FOR DUPLICATE MEDICAL RECORD NUMBER
    // =========================================================================

    const existingPatient = await patientRepository.findByMRN(
      hospitalId,
      medical_record_number
    );

    if (existingPatient) {
      throw ApiError.conflict(
        `Patient with medical record number ${medical_record_number} already exists in this hospital`
      );
    }

    // =========================================================================
    // 3. CREATE PATIENT
    // =========================================================================

    const patientData = {
      hospital_id: hospitalId,
      medical_record_number,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      date_of_birth,
      gender,
      phone: phone.replace(/\D/g, ''), // Remove non-digits
      email: email ? email.toLowerCase().trim() : null,
      blood_group: blood_group || null,
      aadhar_number_encrypted: aadhar_number || null, // Will be encrypted in repository
      pan_number_encrypted: pan_number || null, // Will be encrypted in repository
      address: address ? address.trim() : null,
      city: city ? city.trim() : null,
      state: state ? state.trim() : null,
      postal_code: postal_code ? postal_code.trim() : null,
      emergency_contact_name: emergency_contact_name ? emergency_contact_name.trim() : null,
      emergency_contact_phone: emergency_contact_phone ? emergency_contact_phone.replace(/\D/g, '') : null,
      emergency_contact_relation: emergency_contact_relation ? emergency_contact_relation.trim() : null,
      is_active: true,
    };

    const newPatient = await patientRepository.create(patientData);

    // =========================================================================
    // 4. AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'patient',
      resource_id: newPatient.patient_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          patient_id: newPatient.patient_id,
          medical_record_number: newPatient.medical_record_number,
          name: `${newPatient.first_name} ${newPatient.last_name}`,
        },
      },
    });

    // =========================================================================
    // 5. RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: {
        patient_id: newPatient.patient_id,
        medical_record_number: newPatient.medical_record_number,
        first_name: newPatient.first_name,
        last_name: newPatient.last_name,
        date_of_birth: newPatient.date_of_birth,
        gender: newPatient.gender,
        phone: newPatient.phone,
        email: newPatient.email,
        blood_group: newPatient.blood_group,
        address: newPatient.address,
        created_at: newPatient.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get all patients in hospital (with pagination)
 * GET /api/v1/patients?page=1&limit=20
 */
const listPatients = catchAsync(async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Optional filters
    const filters = {
      search: req.query.search ? req.query.search.trim() : null,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : null,
      gender: req.query.gender ? req.query.gender.trim() : null,
      blood_group: req.query.blood_group ? req.query.blood_group.trim() : null,
    };

    // Get patients with count
    const { patients, totalCount } = await patientRepository.list(
      hospitalId,
      offset,
      limit,
      filters
    );

    // =========================================================================
    // AUDIT LOG (optional - log searches for audit trail)
    // =========================================================================

    if (filters.search) {
      await auditLogger.logAction({
        action: 'SEARCH',
        resource_type: 'patient',
        user_id: req.user.userId,
        hospital_id: hospitalId,
        status: 'success',
        changes: { search_term: filters.search },
      });
    }

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      data: patients,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get single patient by ID
 * GET /api/v1/patients/:patientId
 */
const getPatient = catchAsync(async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      throw ApiError.badRequest('Invalid patient ID format');
    }

    // =========================================================================
    // FETCH PATIENT
    // =========================================================================

    const patient = await patientRepository.findById(hospitalId, patientId);

    if (!patient) {
      throw ApiError.notFound(`Patient ${patientId} not found`);
    }

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'READ',
      resource_type: 'patient',
      resource_id: patientId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Update patient information
 * PUT /api/v1/patients/:patientId
 * 
 * Can update:
 * - first_name, last_name
 * - email, phone
 * - address, city, state, postal_code
 * - emergency contact information
 * - blood_group
 */
const updatePatient = catchAsync(async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      throw ApiError.badRequest('Invalid patient ID format');
    }

    // =========================================================================
    // VALIDATE UPDATE DATA
    // =========================================================================

    const validation = validateUpdatePatient(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    // =========================================================================
    // GET CURRENT PATIENT
    // =========================================================================

    const currentPatient = await patientRepository.findById(hospitalId, patientId);

    if (!currentPatient) {
      throw ApiError.notFound(`Patient ${patientId} not found`);
    }

    // =========================================================================
    // BUILD UPDATE DATA
    // =========================================================================

    const updateData = {};
    const changeLog = {};

    // Only update provided fields
    if (req.body.first_name !== undefined) {
      const newValue = req.body.first_name.trim();
      if (newValue !== currentPatient.first_name) {
        updateData.first_name = newValue;
        changeLog.first_name = {
          old: currentPatient.first_name,
          new: newValue,
        };
      }
    }

    if (req.body.last_name !== undefined) {
      const newValue = req.body.last_name.trim();
      if (newValue !== currentPatient.last_name) {
        updateData.last_name = newValue;
        changeLog.last_name = {
          old: currentPatient.last_name,
          new: newValue,
        };
      }
    }

    if (req.body.email !== undefined) {
      const newValue = req.body.email ? req.body.email.toLowerCase().trim() : null;
      if (newValue !== currentPatient.email) {
        updateData.email = newValue;
        changeLog.email = {
          old: currentPatient.email ? '***' : null,
          new: newValue ? '***' : null,
        };
      }
    }

    if (req.body.phone !== undefined) {
      const newValue = req.body.phone.replace(/\D/g, '');
      if (newValue !== currentPatient.phone) {
        updateData.phone = newValue;
        changeLog.phone = {
          old: currentPatient.phone ? '****' : null,
          new: newValue ? '****' : null,
        };
      }
    }

    if (req.body.blood_group !== undefined) {
      const newValue = req.body.blood_group ? req.body.blood_group.trim() : null;
      if (newValue !== currentPatient.blood_group) {
        updateData.blood_group = newValue;
        changeLog.blood_group = {
          old: currentPatient.blood_group,
          new: newValue,
        };
      }
    }

    if (req.body.address !== undefined) {
      const newValue = req.body.address ? req.body.address.trim() : null;
      if (newValue !== currentPatient.address) {
        updateData.address = newValue;
        changeLog.address = newValue ? 'updated' : null;
      }
    }

    if (req.body.city !== undefined) {
      const newValue = req.body.city ? req.body.city.trim() : null;
      if (newValue !== currentPatient.city) {
        updateData.city = newValue;
        changeLog.city = newValue;
      }
    }

    if (req.body.state !== undefined) {
      const newValue = req.body.state ? req.body.state.trim() : null;
      if (newValue !== currentPatient.state) {
        updateData.state = newValue;
        changeLog.state = newValue;
      }
    }

    if (req.body.postal_code !== undefined) {
      const newValue = req.body.postal_code ? req.body.postal_code.trim() : null;
      if (newValue !== currentPatient.postal_code) {
        updateData.postal_code = newValue;
        changeLog.postal_code = newValue;
      }
    }

    if (req.body.emergency_contact_name !== undefined) {
      const newValue = req.body.emergency_contact_name ? req.body.emergency_contact_name.trim() : null;
      if (newValue !== currentPatient.emergency_contact_name) {
        updateData.emergency_contact_name = newValue;
        changeLog.emergency_contact_name = newValue;
      }
    }

    if (req.body.emergency_contact_phone !== undefined) {
      const newValue = req.body.emergency_contact_phone ? req.body.emergency_contact_phone.replace(/\D/g, '') : null;
      if (newValue !== currentPatient.emergency_contact_phone) {
        updateData.emergency_contact_phone = newValue;
        changeLog.emergency_contact_phone = newValue ? '****' : null;
      }
    }

    if (req.body.emergency_contact_relation !== undefined) {
      const newValue = req.body.emergency_contact_relation ? req.body.emergency_contact_relation.trim() : null;
      if (newValue !== currentPatient.emergency_contact_relation) {
        updateData.emergency_contact_relation = newValue;
        changeLog.emergency_contact_relation = newValue;
      }
    }

    // =========================================================================
    // NO CHANGES
    // =========================================================================

    if (Object.keys(updateData).length === 0) {
      return res.json({
        success: true,
        message: 'No changes made',
        data: currentPatient,
      });
    }

    // =========================================================================
    // UPDATE PATIENT
    // =========================================================================

    const updatedPatient = await patientRepository.update(hospitalId, patientId, updateData);

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'patient',
      resource_id: patientId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: changeLog,
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      message: 'Patient updated successfully',
      data: updatedPatient,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Soft delete patient (mark as inactive)
 * DELETE /api/v1/patients/:patientId
 * 
 * Does not actually delete data, just marks as inactive
 * HIPAA compliance: keeps data for audit trails
 */
const deletePatient = catchAsync(async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      throw ApiError.badRequest('Invalid patient ID format');
    }

    // =========================================================================
    // GET CURRENT PATIENT
    // =========================================================================

    const patient = await patientRepository.findById(hospitalId, patientId);

    if (!patient) {
      throw ApiError.notFound(`Patient ${patientId} not found`);
    }

    if (!patient.is_active) {
      throw ApiError.conflict('Patient is already inactive');
    }

    // =========================================================================
    // SOFT DELETE
    // =========================================================================

    await patientRepository.softDelete(hospitalId, patientId);

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'DELETE',
      resource_type: 'patient',
      resource_id: patientId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        is_active: {
          old: true,
          new: false,
        },
      },
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      message: 'Patient deactivated successfully',
      data: {
        patient_id: patientId,
        is_active: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get patient with full medical history
 * GET /api/v1/patients/:patientId/full-record
 * 
 * Returns: Patient info + allergies + recent consultations + active prescriptions
 */
const getPatientFullRecord = catchAsync(async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      throw ApiError.badRequest('Invalid patient ID format');
    }

    // =========================================================================
    // FETCH FULL RECORD
    // =========================================================================

    const fullRecord = await patientRepository.getFullRecord(hospitalId, patientId);

    if (!fullRecord) {
      throw ApiError.notFound(`Patient ${patientId} not found`);
    }

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'READ',
      resource_type: 'patient_full_record',
      resource_id: patientId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      data: fullRecord,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  createPatient,
  listPatients,
  getPatient,
  updatePatient,
  deletePatient,
  getPatientFullRecord,
};