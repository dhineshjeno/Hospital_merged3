const scheduleRepository = require('./scheduleRepository');
const doctorRepository = require('../P02/doctorRepository');
const { query } = require('../config/database');
const {
  validateCreateSchedule,
  validateUpdateSchedule,
  validateAvailableSlotsQuery,
} = require('./scheduleValidator');
const { generateAvailableSlots } = require('./slotGenerator');
const { ApiError } = require('../utils/ApiError');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidId(id, label) {
  if (!UUID_REGEX.test(id)) {
    throw ApiError.badRequest(`${label} must be a valid UUID.`);
  }
}

async function assertDoctorExists(doctorId) {
  const doctor = await doctorRepository.findDoctorById(doctorId);
  if (!doctor) {
    throw ApiError.notFound('Doctor not found.');
  }
  return doctor;
}

function handleScheduleDbError(error, next) {
  if (error.code === '23P01') {
    return next(ApiError.conflict(
      'This schedule overlaps an existing active schedule for the same doctor, '
      + 'day of week, and date range. Adjust the time range, day, or effective dates.',
    ));
  }
  if (error.code === '23505') {
    return next(ApiError.conflict(
      'A schedule with the same doctor, day_of_week, start_time, and effective_from already exists.',
    ));
  }
  if (error.code === '23514') {
    return next(ApiError.badRequest(
      'The schedule violates a database constraint (check start_time/end_time/slot_duration_minutes alignment).',
    ));
  }
  return next(error);
}

async function createSchedule(req, res, next) {
  try {
    assertValidId(req.params.doctorId, 'doctorId');
    await assertDoctorExists(req.params.doctorId);
    validateCreateSchedule(req.body);

    const schedule = await scheduleRepository.createSchedule(req.params.doctorId, req.body);

    res.status(201).json({
      status: 'ok',
      data: schedule,
    });
  } catch (error) {
    handleScheduleDbError(error, next);
  }
}

async function listSchedules(req, res, next) {
  try {
    assertValidId(req.params.doctorId, 'doctorId');
    await assertDoctorExists(req.params.doctorId);

    let isActive;
    if (req.query.isActive === 'true') isActive = true;
    if (req.query.isActive === 'false') isActive = false;

    const dayOfWeek = req.query.dayOfWeek !== undefined
      ? Number(req.query.dayOfWeek)
      : undefined;

    const schedules = await scheduleRepository.listSchedulesByDoctor(req.params.doctorId, {
      isActive,
      dayOfWeek,
    });

    res.json({
      status: 'ok',
      data: schedules,
    });
  } catch (error) {
    next(error);
  }
}

async function updateSchedule(req, res, next) {
  try {
    assertValidId(req.params.doctorId, 'doctorId');
    assertValidId(req.params.id, 'doctor_schedule_id');
    validateUpdateSchedule(req.body);

    const existing = await scheduleRepository.findScheduleById(req.params.id, req.params.doctorId);
    if (!existing) {
      throw ApiError.notFound('Schedule not found for this doctor.');
    }

    const schedule = await scheduleRepository.updateSchedule(
      req.params.id,
      req.params.doctorId,
      req.body,
    );

    res.json({
      status: 'ok',
      data: schedule,
    });
  } catch (error) {
    handleScheduleDbError(error, next);
  }
}

async function deactivateSchedule(req, res, next) {
  try {
    assertValidId(req.params.doctorId, 'doctorId');
    assertValidId(req.params.id, 'doctor_schedule_id');

    const existing = await scheduleRepository.findScheduleById(req.params.id, req.params.doctorId);
    if (!existing) {
      throw ApiError.notFound('Schedule not found for this doctor.');
    }

    const schedule = await scheduleRepository.deactivateSchedule(req.params.id, req.params.doctorId);

    res.json({
      status: 'ok',
      message: 'Schedule deactivated.',
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
}

const HOSPITAL_TIMEZONE = 'Asia/Kolkata';

async function getAvailableSlots(req, res, next) {
  try {
    assertValidId(req.params.doctorId, 'doctorId');
    await assertDoctorExists(req.params.doctorId);
    validateAvailableSlotsQuery(req.query);

    const date = req.query.date;

    const dayOfWeekResult = await query(
      `SELECT EXTRACT(DOW FROM $1::date)::int AS day_of_week`,
      [date],
    );
    const dayOfWeek = dayOfWeekResult.rows[0].day_of_week;

    const schedules = await scheduleRepository.findActiveSchedulesForDoctorOnDate(
      req.params.doctorId,
      dayOfWeek,
      date,
    );

    if (schedules.length === 0) {
      return res.json({
        status: 'ok',
        data: {
          date,
          doctor_id: req.params.doctorId,
          slots: [],
        },
      });
    }

    // scheduled_start_at/end_at are timestamptz. The hospital's local day and
    // local time-of-day are computed in HOSPITAL_TIMEZONE, not server/UTC time,
    // so slot matching is correct regardless of where this server runs.
    const bookedResult = await query(
      `SELECT
         EXTRACT(HOUR FROM scheduled_start_at AT TIME ZONE $3)::int * 60
           + EXTRACT(MINUTE FROM scheduled_start_at AT TIME ZONE $3)::int AS start_minutes,
         EXTRACT(HOUR FROM scheduled_end_at AT TIME ZONE $3)::int * 60
           + EXTRACT(MINUTE FROM scheduled_end_at AT TIME ZONE $3)::int AS end_minutes
       FROM appointments
       WHERE doctor_id = $1
         AND status IN ('booked', 'confirmed', 'checked_in', 'in_consultation')
         AND (scheduled_start_at AT TIME ZONE $3)::date = $2::date`,
      [req.params.doctorId, date, HOSPITAL_TIMEZONE],
    );

    const bookedRanges = bookedResult.rows.map((row) => ({
      startMinutes: row.start_minutes,
      endMinutes: row.end_minutes,
    }));

    const slots = generateAvailableSlots(schedules, bookedRanges);

    return res.json({
      status: 'ok',
      data: {
        date,
        doctor_id: req.params.doctorId,
        slots,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createSchedule,
  listSchedules,
  updateSchedule,
  deactivateSchedule,
  getAvailableSlots,
};
