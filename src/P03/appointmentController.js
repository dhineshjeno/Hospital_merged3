// src/controllers/appointmentController.js
// Appointment Controller - HTTP request handlers
// Handles all appointment operations with availability checking and conflict detection

const appointmentRepository = require('./appointmentRepository');
const doctorRepository = require('../P02/doctorRepository');
const patientRepository = require('../P01/patientRepository');
const { validateCreateAppointment, validateUpdateAppointment } = require('./appointmentValidator');
const ApiError = require('../utils/ApiError');
const auditLogger = require('../utils/auditLogger');
const { catchAsync } = require('../middleware/errorHandler');

// ============================================================================
// APPOINTMENT CONTROLLER
// ============================================================================

/**
 * Create a new appointment
 * POST /api/v1/appointments
 * 
 * Required fields:
 * - patient_id
 * - doctor_id
 * - scheduled_start_at (ISO datetime)
 * - scheduled_end_at (ISO datetime)
 * - appointment_type (Consultation|Follow-up|Emergency)
 */
const createAppointment = catchAsync(async (req, res, next) => {
  try {
    // =========================================================================
    // 1. VALIDATE INPUT
    // =========================================================================

    const validation = validateCreateAppointment(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const {
      patient_id,
      doctor_id,
      scheduled_start_at,
      scheduled_end_at,
      appointment_type,
      reason,
      is_telehealth,
    } = req.body;

    const hospitalId = req.hospitalId;

    // =========================================================================
    // 2. VERIFY PATIENT EXISTS
    // =========================================================================

    const patient = await patientRepository.findById(hospitalId, patient_id);
    if (!patient) {
      throw ApiError.patientNotFound(hospitalId, patient_id);
    }

    if (!patient.is_active) {
      throw ApiError.conflict('Patient is inactive');
    }

    // =========================================================================
    // 3. VERIFY DOCTOR EXISTS AND AVAILABLE
    // =========================================================================

    const doctor = await doctorRepository.findById(hospitalId, doctor_id);
    if (!doctor) {
      throw ApiError.doctorNotFound(hospitalId, doctor_id);
    }

    if (!doctor.is_available) {
      throw ApiError.conflict('Doctor is not available');
    }

    // =========================================================================
    // 4. CHECK APPOINTMENT SLOT AVAILABILITY
    // =========================================================================

    const startDate = new Date(scheduled_start_at);
    const dateStr = startDate.toISOString().split('T')[0];

    const availability = await doctorRepository.getDoctorAvailability(
      hospitalId,
      doctor_id,
      dateStr
    );

    if (!availability.is_available) {
      throw ApiError.appointmentSlotUnavailable();
    }

    // =========================================================================
    // 5. CHECK FOR APPOINTMENT CONFLICTS
    // =========================================================================

    const conflictWithPatient = await appointmentRepository.checkPatientConflict(
      hospitalId,
      patient_id,
      scheduled_start_at,
      scheduled_end_at
    );

    if (conflictWithPatient) {
      throw ApiError.appointmentConflict();
    }

    const conflictWithDoctor = await appointmentRepository.checkDoctorConflict(
      hospitalId,
      doctor_id,
      scheduled_start_at,
      scheduled_end_at
    );

    if (conflictWithDoctor) {
      throw ApiError.appointmentSlotConflict();
    }

    // =========================================================================
    // 6. CREATE APPOINTMENT
    // =========================================================================

    const appointmentData = {
      hospital_id: hospitalId,
      patient_id,
      doctor_id,
      scheduled_start_at,
      scheduled_end_at,
      appointment_type,
      status: 'Scheduled',
      reason: reason || null,
      is_telehealth: is_telehealth || false,
    };

    const newAppointment = await appointmentRepository.create(appointmentData);

    // =========================================================================
    // 7. AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'appointment',
      resource_id: newAppointment.appointment_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          appointment_id: newAppointment.appointment_id,
          patient_id,
          doctor_id,
          scheduled_start_at,
        },
      },
    });

    // =========================================================================
    // 8. RESPONSE
    // =========================================================================

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: {
        appointment_id: newAppointment.appointment_id,
        patient_id: newAppointment.patient_id,
        doctor_id: newAppointment.doctor_id,
        scheduled_start_at: newAppointment.scheduled_start_at,
        scheduled_end_at: newAppointment.scheduled_end_at,
        appointment_type: newAppointment.appointment_type,
        status: newAppointment.status,
        reason: newAppointment.reason,
        is_telehealth: newAppointment.is_telehealth,
        created_at: newAppointment.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get all appointments in hospital (with pagination and filters)
 * GET /api/v1/appointments?page=1&limit=20
 */
const listAppointments = catchAsync(async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Optional filters
    const filters = {
      patient_id: req.query.patient_id ? req.query.patient_id.trim() : null,
      doctor_id: req.query.doctor_id ? req.query.doctor_id.trim() : null,
      status: req.query.status ? req.query.status.trim() : null,
      appointment_type: req.query.appointment_type ? req.query.appointment_type.trim() : null,
      date_from: req.query.date_from ? req.query.date_from.trim() : null,
      date_to: req.query.date_to ? req.query.date_to.trim() : null,
    };

    // Get appointments with count
    const { appointments, totalCount } = await appointmentRepository.list(
      hospitalId,
      offset,
      limit,
      filters
    );

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      data: appointments,
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
 * Get single appointment by ID
 * GET /api/v1/appointments/:appointmentId
 */
const getAppointment = catchAsync(async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(appointmentId)) {
      throw ApiError.badRequest('Invalid appointment ID format');
    }

    // =========================================================================
    // FETCH APPOINTMENT
    // =========================================================================

    const appointment = await appointmentRepository.findById(hospitalId, appointmentId);

    if (!appointment) {
      throw ApiError.notFound(`Appointment ${appointmentId} not found`);
    }

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'READ',
      resource_type: 'appointment',
      resource_id: appointmentId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Update appointment status
 * PUT /api/v1/appointments/:appointmentId
 * 
 * Can update:
 * - status (Scheduled|Check-in|In-progress|Completed|Cancelled|No-show)
 * - reason
 * - notes
 */
const updateAppointment = catchAsync(async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const hospitalId = req.hospitalId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(appointmentId)) {
      throw ApiError.badRequest('Invalid appointment ID format');
    }

    // =========================================================================
    // VALIDATE UPDATE DATA
    // =========================================================================

    const validation = validateUpdateAppointment(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    // =========================================================================
    // GET CURRENT APPOINTMENT
    // =========================================================================

    const currentAppointment = await appointmentRepository.findById(hospitalId, appointmentId);

    if (!currentAppointment) {
      throw ApiError.notFound(`Appointment ${appointmentId} not found`);
    }

    // =========================================================================
    // BUILD UPDATE DATA
    // =========================================================================

    const updateData = {};
    const changeLog = {};

    if (req.body.status !== undefined) {
      const newValue = req.body.status.trim();
      if (newValue !== currentAppointment.status) {
        updateData.status = newValue;
        changeLog.status = {
          old: currentAppointment.status,
          new: newValue,
        };
      }
    }

    if (req.body.reason !== undefined) {
      const newValue = req.body.reason ? req.body.reason.trim() : null;
      if (newValue !== currentAppointment.reason) {
        updateData.reason = newValue;
        changeLog.reason = {
          old: currentAppointment.reason,
          new: newValue,
        };
      }
    }

    if (req.body.notes !== undefined) {
      const newValue = req.body.notes ? req.body.notes.trim() : null;
      if (newValue !== currentAppointment.notes) {
        updateData.notes = newValue;
        changeLog.notes = newValue ? 'updated' : null;
      }
    }

    // =========================================================================
    // NO CHANGES
    // =========================================================================

    if (Object.keys(updateData).length === 0) {
      return res.json({
        success: true,
        message: 'No changes made',
        data: currentAppointment,
      });
    }

    // =========================================================================
    // UPDATE APPOINTMENT
    // =========================================================================

    const updatedAppointment = await appointmentRepository.update(
      hospitalId,
      appointmentId,
      updateData
    );

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'appointment',
      resource_id: appointmentId,
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
      message: 'Appointment updated successfully',
      data: updatedAppointment,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Cancel appointment
 * PUT /api/v1/appointments/:appointmentId/cancel
 */
const cancelAppointment = catchAsync(async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const hospitalId = req.hospitalId;
    const { reason } = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(appointmentId)) {
      throw ApiError.badRequest('Invalid appointment ID format');
    }

    // =========================================================================
    // GET CURRENT APPOINTMENT
    // =========================================================================

    const appointment = await appointmentRepository.findById(hospitalId, appointmentId);

    if (!appointment) {
      throw ApiError.notFound(`Appointment ${appointmentId} not found`);
    }

    if (!['Scheduled', 'Check-in'].includes(appointment.status)) {
      throw ApiError.conflict(`Cannot cancel appointment with status: ${appointment.status}`);
    }

    // =========================================================================
    // CANCEL APPOINTMENT
    // =========================================================================

    const updatedAppointment = await appointmentRepository.update(
      hospitalId,
      appointmentId,
      {
        status: 'Cancelled',
        notes: reason || null,
      }
    );

    // =========================================================================
    // AUDIT LOG
    // =========================================================================

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'appointment',
      resource_id: appointmentId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        status: {
          old: appointment.status,
          new: 'Cancelled',
        },
      },
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: updatedAppointment,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get available slots for doctor on a specific date
 * GET /api/v1/appointments/availability?doctor_id=UUID&date=YYYY-MM-DD
 */
const getAvailableSlots = catchAsync(async (req, res, next) => {
  try {
    const { doctor_id, date } = req.query;
    const hospitalId = req.hospitalId;

    // Validate required parameters
    if (!doctor_id || !date) {
      throw ApiError.badRequest('doctor_id and date are required');
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw ApiError.badRequest('date must be in YYYY-MM-DD format');
    }

    // =========================================================================
    // GET DOCTOR AVAILABILITY
    // =========================================================================

    const availability = await doctorRepository.getDoctorAvailability(
      hospitalId,
      doctor_id,
      date
    );

    // =========================================================================
    // RESPONSE
    // =========================================================================

    res.json({
      success: true,
      data: {
        doctor_id,
        date,
        ...availability,
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
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  cancelAppointment,
  getAvailableSlots,
};