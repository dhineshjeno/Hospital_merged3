// src/controllers/doctorController.js
// Doctor Controller - HTTP request handlers
// Handles all doctor-related operations with full validation and error handling

const doctorRepository = require('./doctorRepository');
const { validateCreateDoctor, validateUpdateDoctor } = require('./doctorValidator');
const ApiError = require('../utils/ApiError');
const auditLogger = require('../utils/auditLogger');
const { catchAsync } = require('../middleware/errorHandler');

// ============================================================================
// DOCTOR CONTROLLER
// ============================================================================

/**
 * Create a new doctor
 * POST /api/v1/doctors
 * 
 * Required fields:
 * - user_id (must be admin/doctor role)
 * - employee_code (unique per hospital)
 * - specialization
 * - registration_number (medical license)
 */
const createDoctor = catchAsync(async (req, res, next) => {
  try {
    // =========================================================================
    // 1. VALIDATE INPUT
    // =========================================================================

    const validation = validateCreateDoctor(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const {
      user_id,
      employee_code,
      specialization,
      registration_number,
      qualification,
      experience_years,
      consultation_fee,
      department_id,
    } = req.body;

    const hospitalId = req.hospitalId;

    // =========================================================================
    // 2. CHECK FOR DUPLICATE EMPLOYEE CODE
    // =========================================================================

    const existingByCode = await doctorRepository.findByEmployeeCode(
      hospitalId,
      employee_code
    );

    if (existingByCode) {
      throw ApiError.conflict(
        `Doctor with employee code ${employee_code} already exists in this hospital`
      );
    }

    // =========================================================================
    // 3. CHECK FOR DUPLICATE REGISTRATION NUMBER
    // =========================================================================

    const existingByRegistration = await doctorRepository.findByRegistrationNumber(
      hospitalId,
      registration_number
    );

    if (existingByRegistration) {
      throw ApiError.conflict(
        `Doctor with registration number ${registration_number} already exists in this hospital`
      );
    }

    // =========================================================================
    // 4. CREATE DOCTOR
    // =========================================================================

    const doctorData = {
      hospital_id: hospitalId,
      user_id,
      employee_code: employee_code.trim(),
      specialization: specialization.trim(),
      registration_number: registration_number.trim(),
      qualification: qualification ? qualification.trim() : null,
      experience_years: experience_years || 0,
      is_available: true,
      consultation_fee: consultation_fee || null,
      department_id: department_id || null,
    };

    const newDoctor = await doctorRepository.create(doctorData);

    // =========================================================================
    // 5. AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'doctor',
      resource_id: newDoctor.doctor_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          doctor_id: newDoctor.doctor_id,
          employee_code: newDoctor.employee_code,
          specialization: newDoctor.specialization,
        },
      },
    });

    // =========================================================================
    // 6. RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: {
        doctor_id: newDoctor.doctor_id,
        user_id: newDoctor.user_id,
        employee_code: newDoctor.employee_code,
        specialization: newDoctor.specialization,
        registration_number: newDoctor.registration_number,
        qualification: newDoctor.qualification,
        experience_years: newDoctor.experience_years,
        is_available: newDoctor.is_available,
        consultation_fee: newDoctor.consultation_fee,
        department_id: newDoctor.department_id,
        created_at: newDoctor.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get all doctors in hospital (with pagination)
 * GET /api/v1/doctors?page=1&limit=20
 */
const listDoctors = catchAsync(async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Optional filters
    const filters = {
      search: req.query.search ? req.query.search.trim() : null,
      specialization: req.query.specialization ? req.query.specialization.trim() : null,
      is_available: req.query.is_available !== undefined ? req.query.is_available === 'true' : null,
      department_id: req.query.department_id ? req.query.department_id.trim() : null,
    };

    // Get doctors with count
    const { doctors, totalCount } = await doctorRepository.list(
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
        resource_type: 'doctor',
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
      data: doctors,
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
 * Get single doctor by ID
 * GET /api/v1/doctors/:doctorId
 */
const getDoctor = catchAsync(async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(doctorId)) {
      throw ApiError.badRequest('Invalid doctor ID format');
    }

    // =========================================================================
    // FETCH DOCTOR
    // =========================================================================

    const doctor = await doctorRepository.findById(hospitalId, doctorId);

    if (!doctor) {
      throw ApiError.notFound(`Doctor ${doctorId} not found`);
    }

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'READ',
      resource_type: 'doctor',
      resource_id: doctorId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Update doctor information
 * PUT /api/v1/doctors/:doctorId
 * 
 * Can update:
 * - specialization
 * - qualification
 * - experience_years
 * - consultation_fee
 * - is_available
 * - department_id
 */
const updateDoctor = catchAsync(async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(doctorId)) {
      throw ApiError.badRequest('Invalid doctor ID format');
    }

    // =========================================================================
    // VALIDATE UPDATE DATA
    // =========================================================================

    const validation = validateUpdateDoctor(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    // =========================================================================
    // GET CURRENT DOCTOR
    // =========================================================================

    const currentDoctor = await doctorRepository.findById(hospitalId, doctorId);

    if (!currentDoctor) {
      throw ApiError.notFound(`Doctor ${doctorId} not found`);
    }

    // =========================================================================
    // BUILD UPDATE DATA
    // =========================================================================

    const updateData = {};
    const changeLog = {};

    if (req.body.specialization !== undefined) {
      const newValue = req.body.specialization.trim();
      if (newValue !== currentDoctor.specialization) {
        updateData.specialization = newValue;
        changeLog.specialization = {
          old: currentDoctor.specialization,
          new: newValue,
        };
      }
    }

    if (req.body.qualification !== undefined) {
      const newValue = req.body.qualification ? req.body.qualification.trim() : null;
      if (newValue !== currentDoctor.qualification) {
        updateData.qualification = newValue;
        changeLog.qualification = {
          old: currentDoctor.qualification,
          new: newValue,
        };
      }
    }

    if (req.body.experience_years !== undefined) {
      const newValue = parseInt(req.body.experience_years);
      if (newValue !== currentDoctor.experience_years) {
        updateData.experience_years = newValue;
        changeLog.experience_years = {
          old: currentDoctor.experience_years,
          new: newValue,
        };
      }
    }

    if (req.body.consultation_fee !== undefined) {
      const newValue = req.body.consultation_fee ? parseFloat(req.body.consultation_fee) : null;
      if (newValue !== currentDoctor.consultation_fee) {
        updateData.consultation_fee = newValue;
        changeLog.consultation_fee = {
          old: currentDoctor.consultation_fee,
          new: newValue,
        };
      }
    }

    if (req.body.is_available !== undefined) {
      const newValue = Boolean(req.body.is_available);
      if (newValue !== currentDoctor.is_available) {
        updateData.is_available = newValue;
        changeLog.is_available = {
          old: currentDoctor.is_available,
          new: newValue,
        };
      }
    }

    if (req.body.department_id !== undefined) {
      const newValue = req.body.department_id ? req.body.department_id.trim() : null;
      if (newValue !== currentDoctor.department_id) {
        updateData.department_id = newValue;
        changeLog.department_id = {
          old: currentDoctor.department_id,
          new: newValue,
        };
      }
    }

    // =========================================================================
    // NO CHANGES
    // =========================================================================

    if (Object.keys(updateData).length === 0) {
      return res.json({
        success: true,
        message: 'No changes made',
        data: currentDoctor,
      });
    }

    // =========================================================================
    // UPDATE DOCTOR
    // =========================================================================

    const updatedDoctor = await doctorRepository.update(hospitalId, doctorId, updateData);

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'doctor',
      resource_id: doctorId,
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
      message: 'Doctor updated successfully',
      data: updatedDoctor,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get doctor with schedule and appointments
 * GET /api/v1/doctors/:doctorId/schedule
 */
const getDoctorSchedule = catchAsync(async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(doctorId)) {
      throw ApiError.badRequest('Invalid doctor ID format');
    }

    // =========================================================================
    // FETCH DOCTOR WITH SCHEDULE
    // =========================================================================

    const schedule = await doctorRepository.getDoctorSchedule(hospitalId, doctorId);

    if (!schedule) {
      throw ApiError.notFound(`Doctor ${doctorId} not found`);
    }

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get doctor availability for a specific date
 * GET /api/v1/doctors/:doctorId/availability?date=2026-07-10
 */
const getDoctorAvailability = catchAsync(async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(doctorId)) {
      throw ApiError.badRequest('Invalid doctor ID format');
    }

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw ApiError.badRequest('Date must be in YYYY-MM-DD format');
    }

    // =========================================================================
    // FETCH AVAILABILITY
    // =========================================================================

    const availability = await doctorRepository.getDoctorAvailability(
      hospitalId,
      doctorId,
      date
    );

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      data: {
        doctor_id: doctorId,
        date,
        is_available: availability.is_available,
        available_slots: availability.available_slots || [],
        booked_slots: availability.booked_slots || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Deactivate doctor (mark as unavailable)
 * PUT /api/v1/doctors/:doctorId/deactivate
 */
const deactivateDoctor = catchAsync(async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(doctorId)) {
      throw ApiError.badRequest('Invalid doctor ID format');
    }

    // =========================================================================
    // GET CURRENT DOCTOR
    // =========================================================================

    const doctor = await doctorRepository.findById(hospitalId, doctorId);

    if (!doctor) {
      throw ApiError.notFound(`Doctor ${doctorId} not found`);
    }

    // =========================================================================
    // SOFT DELETE
    // =========================================================================

    await doctorRepository.softDelete(hospitalId, doctorId);

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'DELETE',
      resource_type: 'doctor',
      resource_id: doctorId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        is_available: {
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
      message: 'Doctor deactivated successfully',
      data: {
        doctor_id: doctorId,
        is_available: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  createDoctor,
  listDoctors,
  getDoctor,
  updateDoctor,
  getDoctorSchedule,
  getDoctorAvailability,
  deactivateDoctor,
};