const { ApiError } = require('../utils/ApiError');

const ALLERGY_TYPES = ['medication', 'food', 'environmental', 'other'];
const SEVERITY_VALUES = ['mild', 'moderate', 'severe', 'life_threatening'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(v) { return typeof v === 'string' && UUID_REGEX.test(v); }
function isNonEmptyString(v) { return typeof v === 'string' && v.trim().length > 0; }

function validateSearchQuery(query) {
  if (!isNonEmptyString(query.q)) {
    throw ApiError.badRequest('q (search query) is required and must not be empty.');
  }
  if (query.q.trim().length < 2) {
    throw ApiError.badRequest('Search query must be at least 2 characters.');
  }
}

function validateCreateAllergy(body) {
  const errors = [];
  if (!isNonEmptyString(body.allergen)) {
    errors.push('allergen is required.');
  }
  if (body.allergy_type !== undefined && !ALLERGY_TYPES.includes(body.allergy_type)) {
    errors.push(`allergy_type must be one of: ${ALLERGY_TYPES.join(', ')}.`);
  }
  if (body.severity !== undefined && !SEVERITY_VALUES.includes(body.severity)) {
    errors.push(`severity must be one of: ${SEVERITY_VALUES.join(', ')}.`);
  }
  if (body.noted_by_doctor_id !== undefined && body.noted_by_doctor_id !== null
    && !isValidUuid(body.noted_by_doctor_id)) {
    errors.push('noted_by_doctor_id must be a valid UUID.');
  }
  if (errors.length) throw ApiError.badRequest(errors.join(' '));
}

module.exports = {
  validateSearchQuery,
  validateCreateAllergy,
  ALLERGY_TYPES,
  SEVERITY_VALUES,
};
