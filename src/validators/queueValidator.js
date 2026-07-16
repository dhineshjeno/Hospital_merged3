const { ApiError } = require('../utils/ApiError');

const STATUS_VALUES = ['waiting', 'called', 'in_service', 'completed', 'cancelled', 'skipped'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function validateCreateQueueEntry(body) {
  const errors = [];

  if (!isValidUuid(body.patient_id)) {
    errors.push('patient_id is required and must be a valid UUID.');
  }
  if (!isValidUuid(body.doctor_id)) {
    errors.push('doctor_id is required and must be a valid UUID.');
  }
  if (body.appointment_id !== undefined && body.appointment_id !== null
    && !isValidUuid(body.appointment_id)) {
    errors.push('appointment_id must be a valid UUID.');
  }
  if (body.queue_date !== undefined && !DATE_REGEX.test(body.queue_date)) {
    errors.push('queue_date must be in YYYY-MM-DD format.');
  }
  if (body.priority !== undefined) {
    const priority = Number(body.priority);
    if (Number.isNaN(priority) || priority < 0 || priority > 10 || !Number.isInteger(priority)) {
      errors.push('priority must be an integer between 0 and 10.');
    }
  }

  if (errors.length > 0) {
    throw ApiError.badRequest(errors.join(' '));
  }
}

function validateStatusTransition(body) {
  if (!body.status || !STATUS_VALUES.includes(body.status)) {
    throw ApiError.badRequest(`status is required and must be one of: ${STATUS_VALUES.join(', ')}.`);
  }
}

const ALLOWED_TRANSITIONS = {
  waiting: ['called', 'cancelled', 'skipped'],
  called: ['in_service', 'waiting', 'cancelled', 'skipped'],
  in_service: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  skipped: ['waiting'],
};

function assertValidTransition(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw ApiError.conflict(
      `Cannot move queue entry from '${currentStatus}' to '${nextStatus}'. `
      + `Valid next states from '${currentStatus}': ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}.`,
    );
  }
}

module.exports = {
  validateCreateQueueEntry,
  validateStatusTransition,
  assertValidTransition,
  STATUS_VALUES,
  ALLOWED_TRANSITIONS,
};
