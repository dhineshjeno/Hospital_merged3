const queueRepository = require('../repositories/queueRepository');
const patientRepository = require('../repositories/patientRepository');
const doctorRepository = require('../repositories/doctorRepository');
const {
  validateCreateQueueEntry,
  validateStatusTransition,
  assertValidTransition,
} = require('../validators/queueValidator');
const { ApiError } = require('../utils/ApiError');
const { catchAsync } = require('../middleware/errorHandler');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_CONSULTATION_MINUTES = 15;
const MAX_QUEUE_NUMBER_RETRIES = 3;

function assertValidId(id, label) {
  if (!UUID_REGEX.test(id)) {
    throw ApiError.badRequest(`${label} must be a valid UUID.`);
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const createQueueEntry = catchAsync(async (req, res, next) => {
  validateCreateQueueEntry(req.body);

  const patient = await patientRepository.findPatientById(req.body.patient_id);
  if (!patient || patient.hospital_id !== req.hospitalId) {
    throw ApiError.notFound('Patient not found.');
  }

  const doctor = await doctorRepository.findDoctorById(req.body.doctor_id);
  if (!doctor || doctor.hospital_id !== req.hospitalId) {
    throw ApiError.notFound('Doctor not found.');
  }

  let lastError;
  for (let attempt = 0; attempt < MAX_QUEUE_NUMBER_RETRIES; attempt += 1) {
    try {
      const entry = await queueRepository.createQueueEntry(req.hospitalId, req.body);
      return res.status(201).json({
        status: 'ok',
        data: entry,
      });
    } catch (error) {
      lastError = error;
      const isQueueNumberCollision = error.code === '23505'
        && error.constraint === 'uq_queue_entries_doctor_date_number';
      if (!isQueueNumberCollision) {
        break;
      }
    }
  }

  if (lastError.code === '23505' && lastError.constraint === 'uq_queue_entries_doctor_date_number') {
    throw ApiError.conflict('Could not assign a unique queue number after multiple attempts. Please retry.');
  }
  if (lastError.code === '23505' && lastError.constraint === 'uq_queue_entries_appointment') {
    throw ApiError.conflict('This appointment has already been checked into a queue.');
  }
  if (lastError.code === '23505') {
    throw ApiError.conflict('A conflicting queue entry already exists.');
  }
  if (lastError.code === '23503') {
    throw ApiError.badRequest('appointment_id does not match the given patient_id/doctor_id, or does not exist.');
  }
  if (lastError.code === '23514') {
    throw ApiError.badRequest('The queue entry violates a database constraint.');
  }
  throw lastError;
});

const listQueueForDoctor = catchAsync(async (req, res, next) => {
  assertValidId(req.params.doctorId, 'doctorId');

  const queueDate = req.query.date && DATE_REGEX.test(req.query.date)
    ? req.query.date
    : todayIso();

  const entries = await queueRepository.listQueueForDoctor(
    req.hospitalId,
    req.params.doctorId,
    queueDate,
    req.query.status || null,
  );

  res.json({
    status: 'ok',
    data: {
      doctor_id: req.params.doctorId,
      queue_date: queueDate,
      entries,
    },
  });
});

const getQueueEntryById = catchAsync(async (req, res, next) => {
  assertValidId(req.params.id, 'queue_entry_id');

  const entry = await queueRepository.findQueueEntryById(req.hospitalId, req.params.id);
  if (!entry) {
    throw ApiError.notFound('Queue entry not found.');
  }

  let estimatedWaitMinutes = null;
  if (entry.status === 'waiting') {
    const aheadCount = await queueRepository.countAheadInQueue(
      req.hospitalId,
      entry.doctor_id,
      entry.queue_date,
      entry.priority,
      entry.queue_number,
    );
    const stats = await queueRepository.getQueueStatsForDoctor(req.hospitalId, entry.doctor_id, entry.queue_date);
    const avgMinutes = stats.avg_total_minutes
      ? Number(stats.avg_total_minutes)
      : DEFAULT_CONSULTATION_MINUTES;
    estimatedWaitMinutes = Math.round(aheadCount * avgMinutes);
  }

  res.json({
    status: 'ok',
    data: {
      ...entry,
      estimated_wait_minutes: estimatedWaitMinutes,
    },
  });
});

const updateQueueStatus = catchAsync(async (req, res, next) => {
  assertValidId(req.params.id, 'queue_entry_id');
  validateStatusTransition(req.body);

  const existing = await queueRepository.findQueueEntryById(req.hospitalId, req.params.id);
  if (!existing) {
    throw ApiError.notFound('Queue entry not found.');
  }

  assertValidTransition(existing.status, req.body.status);

  const entry = await queueRepository.updateQueueStatus(req.hospitalId, req.params.id, req.body.status);

  res.json({
    status: 'ok',
    data: entry,
  });
});

const getQueueStats = catchAsync(async (req, res, next) => {
  assertValidId(req.params.doctorId, 'doctorId');

  const queueDate = req.query.date && DATE_REGEX.test(req.query.date)
    ? req.query.date
    : todayIso();

  const stats = await queueRepository.getQueueStatsForDoctor(req.hospitalId, req.params.doctorId, queueDate);

  res.json({
    status: 'ok',
    data: {
      doctor_id: req.params.doctorId,
      queue_date: queueDate,
      ...stats,
    },
  });
});

module.exports = {
  createQueueEntry,
  listQueueForDoctor,
  getQueueEntryById,
  updateQueueStatus,
  getQueueStats,
};
