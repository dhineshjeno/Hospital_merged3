// src/controllers/wardController.js
// Ward Controller - Ward, room, and bed management
// Handles room allocation, admissions, discharges, and bed transfers

const wardRepository = require('./wardRepository');
const roomRepository = require('./roomRepository');
const bedRepository = require('./bedRepository');
const admissionRepository = require('./admissionRepository');
const patientRepository = require('../P01/patientRepository');
const { validateCreateWard, validateCreateRoom, validateAdmission } = require('./wardValidator');
const ApiError = require('../utils/ApiError');
const auditLogger = require('../utils/auditLogger');
const { catchAsync } = require('../middleware/errorHandler');

// ============================================================================
// WARD CONTROLLER
// ============================================================================

/**
 * Create a new ward
 * POST /api/v1/wards
 */
const createWard = catchAsync(async (req, res, next) => {
  try {
    const validation = validateCreateWard(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const { name, ward_type, total_beds, description } = req.body;
    const hospitalId = req.hospitalId;

    // Check for duplicate ward name
    const existing = await wardRepository.findByName(hospitalId, name);
    if (existing) {
      throw ApiError.conflict(`Ward ${name} already exists`);
    }

    const wardData = {
      hospital_id: hospitalId,
      name: name.trim(),
      ward_type: ward_type.trim(),
      total_beds: parseInt(total_beds),
      available_beds: parseInt(total_beds),
      description: description ? description.trim() : null,
      status: 'Active',
    };

    const newWard = await wardRepository.create(wardData);

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'ward',
      resource_id: newWard.ward_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          ward_id: newWard.ward_id,
          name,
          total_beds,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Ward created successfully',
      data: newWard,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get all wards
 * GET /api/v1/wards
 */
const getWards = catchAsync(async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const wards = await wardRepository.findByHospital(hospitalId);

    res.json({
      success: true,
      data: wards,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ROOM CONTROLLER
// ============================================================================

/**
 * Create a new room in a ward
 * POST /api/v1/wards/:wardId/rooms
 */
const createRoom = catchAsync(async (req, res, next) => {
  try {
    const { wardId } = req.params;
    const validation = validateCreateRoom(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const { room_number, room_type, total_beds, description } = req.body;
    const hospitalId = req.hospitalId;

    // Verify ward exists
    const ward = await wardRepository.findById(hospitalId, wardId);
    if (!ward) {
      throw ApiError.notFound('Ward not found');
    }

    // Check for duplicate room number in ward
    const existing = await roomRepository.findByNumber(hospitalId, wardId, room_number);
    if (existing) {
      throw ApiError.conflict(`Room ${room_number} already exists in this ward`);
    }

    const roomData = {
      hospital_id: hospitalId,
      ward_id: wardId,
      room_number: room_number.trim(),
      room_type: room_type.trim(),
      total_beds: parseInt(total_beds),
      available_beds: parseInt(total_beds),
      description: description ? description.trim() : null,
      status: 'Active',
    };

    const newRoom = await roomRepository.create(roomData);

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'room',
      resource_id: newRoom.room_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          room_id: newRoom.room_id,
          room_number,
          total_beds,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: newRoom,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get rooms in a ward
 * GET /api/v1/wards/:wardId/rooms
 */
const getRooms = catchAsync(async (req, res, next) => {
  try {
    const { wardId } = req.params;
    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(wardId)) {
      throw ApiError.badRequest('Invalid ward ID format');
    }

    // Verify ward exists
    const ward = await wardRepository.findById(hospitalId, wardId);
    if (!ward) {
      throw ApiError.notFound('Ward not found');
    }

    const rooms = await roomRepository.findByWard(hospitalId, wardId);

    res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BED CONTROLLER
// ============================================================================

/**
 * Create a bed in a room
 * POST /api/v1/wards/:wardId/rooms/:roomId/beds
 */
const createBed = catchAsync(async (req, res, next) => {
  try {
    const { wardId, roomId } = req.params;
    const { bed_number } = req.body;
    const hospitalId = req.hospitalId;

    if (!bed_number) {
      throw ApiError.badRequest('bed_number is required');
    }

    // Verify room exists
    const room = await roomRepository.findById(hospitalId, roomId);
    if (!room || room.ward_id !== wardId) {
      throw ApiError.notFound('Room not found');
    }

    // Check for duplicate bed number in room
    const existing = await bedRepository.findByNumber(hospitalId, roomId, bed_number);
    if (existing) {
      throw ApiError.conflict(`Bed ${bed_number} already exists in this room`);
    }

    const bedData = {
      hospital_id: hospitalId,
      room_id: roomId,
      bed_number: bed_number.toString().trim(),
      status: 'Available',
    };

    const newBed = await bedRepository.create(bedData);

    // Update room available beds
    await roomRepository.updateAvailableBeds(hospitalId, roomId);

    res.status(201).json({
      success: true,
      message: 'Bed created successfully',
      data: newBed,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get beds in a room
 * GET /api/v1/wards/:wardId/rooms/:roomId/beds
 */
const getBeds = catchAsync(async (req, res, next) => {
  try {
    const { wardId, roomId } = req.params;
    const hospitalId = req.hospitalId;

    const room = await roomRepository.findById(hospitalId, roomId);
    if (!room || room.ward_id !== wardId) {
      throw ApiError.notFound('Room not found');
    }

    const beds = await bedRepository.findByRoom(hospitalId, roomId);

    res.json({
      success: true,
      data: beds,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ADMISSION CONTROLLER
// ============================================================================

/**
 * Admit a patient
 * POST /api/v1/admissions
 */
const admitPatient = catchAsync(async (req, res, next) => {
  try {
    const validation = validateAdmission(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error);
    }

    const {
      patient_id,
      bed_id,
      doctor_id,
      admission_reason,
      chief_complaint,
      medical_history,
      admission_type,
      expected_stay_days,
    } = req.body;

    const hospitalId = req.hospitalId;

    // Verify patient exists
    const patient = await patientRepository.findById(hospitalId, patient_id);
    if (!patient) {
      throw ApiError.patientNotFound(hospitalId, patient_id);
    }

    // Verify bed exists and is available
    const bed = await bedRepository.findById(hospitalId, bed_id);
    if (!bed) {
      throw ApiError.notFound('Bed not found');
    }

    if (bed.status !== 'Available') {
      throw ApiError.conflict('Bed is not available');
    }

    // Check if patient already admitted
    const activeAdmission = await admissionRepository.findActiveAdmission(hospitalId, patient_id);
    if (activeAdmission) {
      throw ApiError.conflict('Patient already has an active admission');
    }

    const admissionData = {
      hospital_id: hospitalId,
      patient_id,
      bed_id,
      doctor_id,
      admission_reason: admission_reason.trim(),
      chief_complaint: chief_complaint ? chief_complaint.trim() : null,
      medical_history: medical_history ? medical_history.trim() : null,
      admission_type: admission_type.trim(),
      expected_stay_days: expected_stay_days ? parseInt(expected_stay_days) : null,
      status: 'Active',
      admitted_at: new Date(),
      admitted_by_id: req.user.userId,
    };

    const newAdmission = await admissionRepository.create(admissionData);

    // Update bed status
    await bedRepository.update(hospitalId, bed_id, { status: 'Occupied' });

    // Update room available beds
    const room = await roomRepository.findById(hospitalId, bed.room_id);
    await roomRepository.updateAvailableBeds(hospitalId, bed.room_id);

    await auditLogger.logAction({
      action: 'CREATE',
      resource_type: 'admission',
      resource_id: newAdmission.admission_id,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        created: {
          admission_id: newAdmission.admission_id,
          patient_id,
          bed_id,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Patient admitted successfully',
      data: newAdmission,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Get patient admission
 * GET /api/v1/admissions?patient_id=UUID
 */
const getAdmissions = catchAsync(async (req, res, next) => {
  try {
    const { patient_id, status } = req.query;
    const hospitalId = req.hospitalId;

    if (!patient_id) {
      throw ApiError.badRequest('patient_id is required');
    }

    const admissions = await admissionRepository.findByPatient(
      hospitalId,
      patient_id,
      status || null
    );

    res.json({
      success: true,
      data: admissions,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Discharge a patient
 * PUT /api/v1/admissions/:admissionId/discharge
 */
const dischargePatient = catchAsync(async (req, res, next) => {
  try {
    const { admissionId } = req.params;
    const { discharge_reason, notes } = req.body;
    const hospitalId = req.hospitalId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(admissionId)) {
      throw ApiError.badRequest('Invalid admission ID format');
    }

    const admission = await admissionRepository.findById(hospitalId, admissionId);
    if (!admission) {
      throw ApiError.notFound('Admission not found');
    }

    if (admission.status !== 'Active') {
      throw ApiError.conflict('Can only discharge active admissions');
    }

    const dischargeData = {
      status: 'Discharged',
      discharge_reason: discharge_reason ? discharge_reason.trim() : null,
      notes: notes ? notes.trim() : null,
      discharged_at: new Date(),
      discharged_by_id: req.user.userId,
    };

    const updatedAdmission = await admissionRepository.update(
      hospitalId,
      admissionId,
      dischargeData
    );

    // Mark bed as available
    await bedRepository.update(hospitalId, admission.bed_id, { status: 'Available' });

    // Update room available beds
    const bed = await bedRepository.findById(hospitalId, admission.bed_id);
    await roomRepository.updateAvailableBeds(hospitalId, bed.room_id);

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'admission',
      resource_id: admissionId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        status: {
          old: 'Active',
          new: 'Discharged',
        },
      },
    });

    res.json({
      success: true,
      message: 'Patient discharged successfully',
      data: updatedAdmission,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================

/**
 * Transfer patient to different bed
 * PUT /api/v1/admissions/:admissionId/transfer
 */
const transferPatient = catchAsync(async (req, res, next) => {
  try {
    const { admissionId } = req.params;
    const { new_bed_id, transfer_reason } = req.body;
    const hospitalId = req.hospitalId;

    if (!new_bed_id) {
      throw ApiError.badRequest('new_bed_id is required');
    }

    const admission = await admissionRepository.findById(hospitalId, admissionId);
    if (!admission) {
      throw ApiError.notFound('Admission not found');
    }

    // Verify new bed exists and is available
    const newBed = await bedRepository.findById(hospitalId, new_bed_id);
    if (!newBed) {
      throw ApiError.notFound('New bed not found');
    }

    if (newBed.status !== 'Available') {
      throw ApiError.conflict('New bed is not available');
    }

    const oldBedId = admission.bed_id;

    // Update admission with new bed
    const updatedAdmission = await admissionRepository.update(
      hospitalId,
      admissionId,
      {
        bed_id: new_bed_id,
      }
    );

    // Free old bed
    await bedRepository.update(hospitalId, oldBedId, { status: 'Available' });

    // Occupy new bed
    await bedRepository.update(hospitalId, new_bed_id, { status: 'Occupied' });

    // Update rooms available beds
    const oldBed = await bedRepository.findById(hospitalId, oldBedId);
    const newBedObj = await bedRepository.findById(hospitalId, new_bed_id);
    await roomRepository.updateAvailableBeds(hospitalId, oldBed.room_id);
    await roomRepository.updateAvailableBeds(hospitalId, newBedObj.room_id);

    await auditLogger.logAction({
      action: 'UPDATE',
      resource_type: 'admission',
      resource_id: admissionId,
      user_id: req.user.userId,
      hospital_id: hospitalId,
      status: 'success',
      changes: {
        bed_transfer: {
          old_bed: oldBedId,
          new_bed: new_bed_id,
          reason: transfer_reason || null,
        },
      },
    });

    res.json({
      success: true,
      message: 'Patient transferred successfully',
      data: updatedAdmission,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  createWard,
  getWards,
  createRoom,
  getRooms,
  createBed,
  getBeds,
  admitPatient,
  getAdmissions,
  dischargePatient,
  transferPatient,
};
