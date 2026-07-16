const { ApiError } = require('../utils/ApiError');

const DOSAGE_FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'other'];
const MEDICINE_STATUSES = ['active', 'discontinued'];
const BATCH_STATUSES = ['active', 'expired', 'recalled', 'depleted'];
const TRANSACTION_TYPES = ['stock_in', 'dispense', 'return', 'adjustment', 'expired_writeoff', 'damaged_writeoff'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isNonEmptyString(v) { return typeof v === 'string' && v.trim().length > 0; }
function isValidUuid(v) { return typeof v === 'string' && UUID_REGEX.test(v); }
function isValidDate(v) { return typeof v === 'string' && DATE_REGEX.test(v) && !Number.isNaN(new Date(v).getTime()); }
function isNonNegative(v) { return v !== undefined && v !== null && Number(v) >= 0 && !Number.isNaN(Number(v)); }
function isPositiveInt(v) { return Number.isInteger(Number(v)) && Number(v) > 0; }

// ─── Medicine ─────────────────────────────────────────────────────────────────

function validateCreateMedicine(body) {
  const errors = [];
  if (!isNonEmptyString(body.medicine_code)) errors.push('medicine_code is required.');
  if (!isNonEmptyString(body.medicine_name)) errors.push('medicine_name is required.');
  if (!isNonEmptyString(body.category)) errors.push('category is required.');
  if (!DOSAGE_FORMS.includes(body.dosage_form)) {
    errors.push(`dosage_form must be one of: ${DOSAGE_FORMS.join(', ')}.`);
  }
  if (!isNonEmptyString(body.unit_of_measure)) errors.push('unit_of_measure is required.');
  if (body.unit_price !== undefined && !isNonNegative(body.unit_price)) {
    errors.push('unit_price must be a non-negative number.');
  }
  if (body.reorder_level !== undefined && (!Number.isInteger(Number(body.reorder_level)) || Number(body.reorder_level) < 0)) {
    errors.push('reorder_level must be a non-negative integer.');
  }
  if (errors.length) throw ApiError.badRequest(errors.join(' '));
}

function validateUpdateMedicine(body) {
  const errors = [];
  if (body.medicine_name !== undefined && !isNonEmptyString(body.medicine_name)) {
    errors.push('medicine_name cannot be empty.');
  }
  if (body.dosage_form !== undefined && !DOSAGE_FORMS.includes(body.dosage_form)) {
    errors.push(`dosage_form must be one of: ${DOSAGE_FORMS.join(', ')}.`);
  }
  if (body.unit_price !== undefined && !isNonNegative(body.unit_price)) {
    errors.push('unit_price must be a non-negative number.');
  }
  if (body.status !== undefined && !MEDICINE_STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${MEDICINE_STATUSES.join(', ')}.`);
  }
  if (errors.length) throw ApiError.badRequest(errors.join(' '));
}

// ─── Batches ──────────────────────────────────────────────────────────────────

function validateReceiveBatch(body) {
  const errors = [];
  if (!isNonEmptyString(body.batch_number)) errors.push('batch_number is required.');
  if (!isNonNegative(body.purchase_price)) errors.push('purchase_price must be a non-negative number.');
  if (!isNonNegative(body.selling_price)) errors.push('selling_price must be a non-negative number.');
  if (!isPositiveInt(body.quantity_received)) errors.push('quantity_received must be a positive integer.');
  if (!isValidDate(body.expiry_date)) errors.push('expiry_date is required (YYYY-MM-DD).');
  if (body.manufactured_date !== undefined && body.manufactured_date !== null
    && !isValidDate(body.manufactured_date)) {
    errors.push('manufactured_date must be a valid date (YYYY-MM-DD).');
  }
  if (isValidDate(body.expiry_date) && body.manufactured_date
    && body.manufactured_date > body.expiry_date) {
    errors.push('manufactured_date cannot be after expiry_date.');
  }
  if (errors.length) throw ApiError.badRequest(errors.join(' '));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function validateDispense(body) {
  const errors = [];
  if (!isValidUuid(body.medicine_batch_id)) errors.push('medicine_batch_id is required and must be a valid UUID.');
  if (!isValidUuid(body.patient_id)) errors.push('patient_id is required and must be a valid UUID.');
  if (!isPositiveInt(body.quantity)) errors.push('quantity must be a positive integer.');
  if (body.prescription_item_id !== undefined && body.prescription_item_id !== null
    && !isValidUuid(body.prescription_item_id)) {
    errors.push('prescription_item_id must be a valid UUID.');
  }
  if (errors.length) throw ApiError.badRequest(errors.join(' '));
}

function validateStockIn(body) {
  const errors = [];
  if (!isValidUuid(body.medicine_batch_id)) errors.push('medicine_batch_id is required and must be a valid UUID.');
  if (!isPositiveInt(body.quantity)) errors.push('quantity must be a positive integer.');
  if (errors.length) throw ApiError.badRequest(errors.join(' '));
}

function validateAdjustment(body) {
  const errors = [];
  if (!isValidUuid(body.medicine_batch_id)) errors.push('medicine_batch_id is required and must be a valid UUID.');
  if (body.quantity === undefined || body.quantity === 0 || Number.isNaN(Number(body.quantity))) {
    errors.push('quantity must be a non-zero integer.');
  }
  if (!isNonEmptyString(body.reference_note)) errors.push('reference_note is required for adjustments.');
  if (errors.length) throw ApiError.badRequest(errors.join(' '));
}

module.exports = {
  validateCreateMedicine, validateUpdateMedicine,
  validateReceiveBatch,
  validateDispense, validateStockIn, validateAdjustment,
  DOSAGE_FORMS, MEDICINE_STATUSES, BATCH_STATUSES, TRANSACTION_TYPES,
};
