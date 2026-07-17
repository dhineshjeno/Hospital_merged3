const { ApiError } = require('../utils/ApiError');

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidTime(value) {
  return typeof value === 'string' && TIME_REGEX.test(value);
}

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

function validateCreateSchedule(body) {
  const errors = [];

  const dayOfWeek = Number(body.day_of_week);
  if (body.day_of_week === undefined || Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    errors.push('day_of_week is required and must be an integer between 0 (Sunday) and 6 (Saturday).');
  }

  if (!isValidTime(body.start_time)) {
    errors.push('start_time is required and must be in HH:MM or HH:MM:SS format.');
  }
  if (!isValidTime(body.end_time)) {
    errors.push('end_time is required and must be in HH:MM or HH:MM:SS format.');
  }

  let slotDuration = 15;
  if (body.slot_duration_minutes !== undefined) {
    slotDuration = Number(body.slot_duration_minutes);
    if (Number.isNaN(slotDuration) || slotDuration <= 0) {
      errors.push('slot_duration_minutes must be a positive integer.');
    }
  }

  if (body.max_appointments !== undefined) {
    const maxAppointments = Number(body.max_appointments);
    if (Number.isNaN(maxAppointments) || maxAppointments <= 0) {
      errors.push('max_appointments must be a positive integer.');
    }
  }

  if (isValidTime(body.start_time) && isValidTime(body.end_time)) {
    const startMinutes = timeToMinutes(body.start_time);
    const endMinutes = timeToMinutes(body.end_time);

    if (startMinutes >= endMinutes) {
      errors.push('start_time must be before end_time.');
    } else if (!Number.isNaN(slotDuration) && slotDuration > 0) {
      const shiftLength = endMinutes - startMinutes;
      if (shiftLength % slotDuration !== 0) {
        errors.push(
          `The shift length (${shiftLength} minutes) must be evenly divisible by `
          + `slot_duration_minutes (${slotDuration} minutes). Adjust the time range or slot duration.`,
        );
      }
    }
  }

  if (body.effective_from !== undefined && !isValidDate(body.effective_from)) {
    errors.push('effective_from must be a valid date (YYYY-MM-DD).');
  }
  if (body.effective_to !== undefined && body.effective_to !== null && !isValidDate(body.effective_to)) {
    errors.push('effective_to must be a valid date (YYYY-MM-DD).');
  }
  if (
    isValidDate(body.effective_from) && body.effective_to
    && isValidDate(body.effective_to)
    && body.effective_to < body.effective_from
  ) {
    errors.push('effective_to cannot be before effective_from.');
  }

  if (errors.length > 0) {
    throw ApiError.badRequest(errors.join(' '));
  }
}

function validateUpdateSchedule(body) {
  const errors = [];

  if (body.day_of_week !== undefined) {
    const dayOfWeek = Number(body.day_of_week);
    if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      errors.push('day_of_week must be an integer between 0 (Sunday) and 6 (Saturday).');
    }
  }
  if (body.start_time !== undefined && !isValidTime(body.start_time)) {
    errors.push('start_time must be in HH:MM or HH:MM:SS format.');
  }
  if (body.end_time !== undefined && !isValidTime(body.end_time)) {
    errors.push('end_time must be in HH:MM or HH:MM:SS format.');
  }
  if (body.slot_duration_minutes !== undefined) {
    const slotDuration = Number(body.slot_duration_minutes);
    if (Number.isNaN(slotDuration) || slotDuration <= 0) {
      errors.push('slot_duration_minutes must be a positive integer.');
    }
  }
  if (body.max_appointments !== undefined) {
    const maxAppointments = Number(body.max_appointments);
    if (Number.isNaN(maxAppointments) || maxAppointments <= 0) {
      errors.push('max_appointments must be a positive integer.');
    }
  }
  if (body.effective_from !== undefined && !isValidDate(body.effective_from)) {
    errors.push('effective_from must be a valid date (YYYY-MM-DD).');
  }
  if (body.effective_to !== undefined && body.effective_to !== null && !isValidDate(body.effective_to)) {
    errors.push('effective_to must be a valid date (YYYY-MM-DD).');
  }

  if (errors.length > 0) {
    throw ApiError.badRequest(errors.join(' '));
  }
}

function validateAvailableSlotsQuery(query) {
  if (!isValidDate(query.date)) {
    throw ApiError.badRequest('date query parameter is required and must be a valid date (YYYY-MM-DD).');
  }
}

module.exports = {
  validateCreateSchedule,
  validateUpdateSchedule,
  validateAvailableSlotsQuery,
  isValidTime,
  isValidDate,
  timeToMinutes,
};
