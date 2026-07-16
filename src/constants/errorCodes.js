// src/constants/errorCodes.js
// Standardized Error Codes for Hospital Management System
// Used for consistent error handling and frontend mapping

/**
 * Error Codes organized by category
 * Frontend can use these codes to display appropriate messages
 * 
 * Format: CATEGORY_DESCRIPTION
 * Example: PATIENT_NOT_FOUND, APPOINTMENT_CONFLICT, INSUFFICIENT_MEDICINE
 */

const ERROR_CODES = {
  // =========================================================================
  // GENERAL ERRORS (4xx, 5xx)
  // =========================================================================

  // 400 Bad Request
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT_FORMAT: 'INVALID_INPUT_FORMAT',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  INVALID_PHONE_FORMAT: 'INVALID_PHONE_FORMAT',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  INVALID_UUID_FORMAT: 'INVALID_UUID_FORMAT',

  // 401 Unauthorized
  UNAUTHORIZED: 'UNAUTHORIZED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID_FORMAT: 'TOKEN_INVALID_FORMAT',

  // 403 Forbidden
  FORBIDDEN: 'FORBIDDEN',
  ACCESS_DENIED: 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ROLE_REQUIRED: 'ROLE_REQUIRED',

  // 404 Not Found
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // 409 Conflict
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',

  // 429 Too Many Requests
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_LOGIN_ATTEMPTS: 'TOO_MANY_LOGIN_ATTEMPTS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

  // 500 Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // =========================================================================
  // HOSPITAL-SPECIFIC ERRORS
  // =========================================================================

  INVALID_HOSPITAL_ID: 'INVALID_HOSPITAL_ID',
  HOSPITAL_NOT_FOUND: 'HOSPITAL_NOT_FOUND',
  HOSPITAL_INACTIVE: 'HOSPITAL_INACTIVE',
  CROSS_HOSPITAL_ACCESS: 'CROSS_HOSPITAL_ACCESS',

  // =========================================================================
  // USER & AUTHENTICATION ERRORS
  // =========================================================================

  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_SUSPENDED: 'USER_SUSPENDED',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_ROLE: 'INVALID_ROLE',
  USER_NOT_IN_HOSPITAL: 'USER_NOT_IN_HOSPITAL',

  // =========================================================================
  // PATIENT-RELATED ERRORS
  // =========================================================================

  PATIENT_NOT_FOUND: 'PATIENT_NOT_FOUND',
  PATIENT_INACTIVE: 'PATIENT_INACTIVE',
  PATIENT_DUPLICATE_MRN: 'PATIENT_DUPLICATE_MRN', // MRN = Medical Record Number
  PATIENT_ALLERGY_WARNING: 'PATIENT_ALLERGY_WARNING',
  PATIENT_ALLERGY_CRITICAL: 'PATIENT_ALLERGY_CRITICAL',
  PATIENT_CONSENT_MISSING: 'PATIENT_CONSENT_MISSING',

  // =========================================================================
  // DOCTOR-RELATED ERRORS
  // =========================================================================

  DOCTOR_NOT_FOUND: 'DOCTOR_NOT_FOUND',
  DOCTOR_UNAVAILABLE: 'DOCTOR_UNAVAILABLE',
  DOCTOR_NOT_IN_HOSPITAL: 'DOCTOR_NOT_IN_HOSPITAL',
  DOCTOR_NOT_ASSIGNED: 'DOCTOR_NOT_ASSIGNED',
  DOCTOR_DUPLICATE_REGISTRATION: 'DOCTOR_DUPLICATE_REGISTRATION',

  // =========================================================================
  // APPOINTMENT-RELATED ERRORS
  // =========================================================================

  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  APPOINTMENT_SLOT_UNAVAILABLE: 'APPOINTMENT_SLOT_UNAVAILABLE',
  APPOINTMENT_SLOT_CONFLICT: 'APPOINTMENT_SLOT_CONFLICT',
  APPOINTMENT_TIME_INVALID: 'APPOINTMENT_TIME_INVALID',
  APPOINTMENT_PAST_DATE: 'APPOINTMENT_PAST_DATE',
  APPOINTMENT_DOUBLE_BOOKING: 'APPOINTMENT_DOUBLE_BOOKING',
  APPOINTMENT_OVERLAP: 'APPOINTMENT_OVERLAP',
  APPOINTMENT_DOCTOR_UNAVAILABLE: 'APPOINTMENT_DOCTOR_UNAVAILABLE',
  APPOINTMENT_SLOT_FULL: 'APPOINTMENT_SLOT_FULL',

  // =========================================================================
  // CONSULTATION & EHR ERRORS
  // =========================================================================

  CONSULTATION_NOT_FOUND: 'CONSULTATION_NOT_FOUND',
  CONSULTATION_INCOMPLETE: 'CONSULTATION_INCOMPLETE',
  VITAL_INVALID_RANGE: 'VITAL_INVALID_RANGE',
  VITAL_OUT_OF_NORMAL: 'VITAL_OUT_OF_NORMAL',
  DIAGNOSIS_NOT_FOUND: 'DIAGNOSIS_NOT_FOUND',

  // =========================================================================
  // PRESCRIPTION & MEDICINE ERRORS
  // =========================================================================

  PRESCRIPTION_NOT_FOUND: 'PRESCRIPTION_NOT_FOUND',
  PRESCRIPTION_EXPIRED: 'PRESCRIPTION_EXPIRED',
  PRESCRIPTION_ALREADY_DISPENSED: 'PRESCRIPTION_ALREADY_DISPENSED',
  PRESCRIPTION_CANCELLED: 'PRESCRIPTION_CANCELLED',
  PRESCRIPTION_ALLERGY_CONFLICT: 'PRESCRIPTION_ALLERGY_CONFLICT',
  PRESCRIPTION_INTERACTION_WARNING: 'PRESCRIPTION_INTERACTION_WARNING',
  PRESCRIPTION_INVALID_DOSAGE: 'PRESCRIPTION_INVALID_DOSAGE',

  MEDICINE_NOT_FOUND: 'MEDICINE_NOT_FOUND',
  MEDICINE_OUT_OF_STOCK: 'MEDICINE_OUT_OF_STOCK',
  MEDICINE_INSUFFICIENT_QUANTITY: 'MEDICINE_INSUFFICIENT_QUANTITY',
  MEDICINE_EXPIRED: 'MEDICINE_EXPIRED',
  MEDICINE_BATCH_INVALID: 'MEDICINE_BATCH_INVALID',

  // =========================================================================
  // LAB-RELATED ERRORS
  // =========================================================================

  LAB_ORDER_NOT_FOUND: 'LAB_ORDER_NOT_FOUND',
  LAB_ORDER_CANCELLED: 'LAB_ORDER_CANCELLED',
  LAB_RESULT_NOT_FOUND: 'LAB_RESULT_NOT_FOUND',
  LAB_TEST_NOT_FOUND: 'LAB_TEST_NOT_FOUND',
  LAB_RESULT_ABNORMAL: 'LAB_RESULT_ABNORMAL',
  LAB_SAMPLE_NOT_COLLECTED: 'LAB_SAMPLE_NOT_COLLECTED',
  LAB_SAMPLE_LOST: 'LAB_SAMPLE_LOST',

  // =========================================================================
  // BILLING & PAYMENT ERRORS
  // =========================================================================

  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  INVOICE_ALREADY_PAID: 'INVOICE_ALREADY_PAID',
  INVOICE_PARTIALLY_PAID: 'INVOICE_PARTIALLY_PAID',
  INVOICE_OVERDUE: 'INVOICE_OVERDUE',
  INVOICE_CANCELLED: 'INVOICE_CANCELLED',
  INVOICE_DUPLICATE_NUMBER: 'INVOICE_DUPLICATE_NUMBER',

  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  PAYMENT_AMOUNT_MISMATCH: 'PAYMENT_AMOUNT_MISMATCH',
  PAYMENT_INVALID_METHOD: 'PAYMENT_INVALID_METHOD',
  PAYMENT_TRANSACTION_FAILED: 'PAYMENT_TRANSACTION_FAILED',

  // =========================================================================
  // WARD & ADMISSION ERRORS
  // =========================================================================

  WARD_NOT_FOUND: 'WARD_NOT_FOUND',
  WARD_FULL: 'WARD_FULL',
  BED_NOT_FOUND: 'BED_NOT_FOUND',
  BED_OCCUPIED: 'BED_OCCUPIED',
  BED_UNAVAILABLE: 'BED_UNAVAILABLE',
  BED_MAINTENANCE: 'BED_MAINTENANCE',

  ADMISSION_NOT_FOUND: 'ADMISSION_NOT_FOUND',
  ADMISSION_ALREADY_ACTIVE: 'ADMISSION_ALREADY_ACTIVE',
  ADMISSION_ALREADY_DISCHARGED: 'ADMISSION_ALREADY_DISCHARGED',
  NO_AVAILABLE_BEDS: 'NO_AVAILABLE_BEDS',
  BED_TRANSFER_INVALID: 'BED_TRANSFER_INVALID',

  DISCHARGE_INVALID: 'DISCHARGE_INVALID',
  DISCHARGE_NOT_ALLOWED: 'DISCHARGE_NOT_ALLOWED',

  // =========================================================================
  // QUEUE MANAGEMENT ERRORS
  // =========================================================================

  QUEUE_ENTRY_NOT_FOUND: 'QUEUE_ENTRY_NOT_FOUND',
  QUEUE_INVALID_NUMBER: 'QUEUE_INVALID_NUMBER',
  QUEUE_FULL: 'QUEUE_FULL',
  QUEUE_CLOSED: 'QUEUE_CLOSED',

  // =========================================================================
  // VALIDATION ERRORS
  // =========================================================================

  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_DATA: 'INVALID_DATA',

  // =========================================================================
  // PERMISSION & AUTHORIZATION ERRORS
  // =========================================================================

  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  DOCTOR_CANNOT_ACCESS_PATIENT: 'DOCTOR_CANNOT_ACCESS_PATIENT',

  // =========================================================================
  // BUSINESS LOGIC ERRORS
  // =========================================================================

  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  INVALID_OPERATION: 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',

  // =========================================================================
  // EXTERNAL SERVICE ERRORS
  // =========================================================================

  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
  SMS_SERVICE_ERROR: 'SMS_SERVICE_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
};

/**
 * HTTP Status Code Mapping
 * Maps error codes to appropriate HTTP status codes
 */
const ERROR_STATUS_CODES = {
  // 400 Bad Request
  INVALID_REQUEST: 400,
  MISSING_REQUIRED_FIELD: 400,
  INVALID_INPUT_FORMAT: 400,
  INVALID_EMAIL_FORMAT: 400,
  INVALID_PHONE_FORMAT: 400,
  INVALID_DATE_FORMAT: 400,
  VALIDATION_ERROR: 400,
  VALIDATION_FAILED: 400,
  INVALID_DATA: 400,
  APPOINTMENT_TIME_INVALID: 400,
  APPOINTMENT_PAST_DATE: 400,
  PRESCRIPTION_INVALID_DOSAGE: 400,
  PAYMENT_AMOUNT_MISMATCH: 400,
  PAYMENT_INVALID_METHOD: 400,

  // 401 Unauthorized
  UNAUTHORIZED: 401,
  AUTHENTICATION_REQUIRED: 401,
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,

  // 403 Forbidden
  FORBIDDEN: 403,
  ACCESS_DENIED: 403,
  INSUFFICIENT_PERMISSIONS: 403,
  ROLE_REQUIRED: 403,
  CROSS_HOSPITAL_ACCESS: 403,
  PERMISSION_DENIED: 403,
  DOCTOR_CANNOT_ACCESS_PATIENT: 403,
  INSUFFICIENT_ROLE: 403,

  // 404 Not Found
  NOT_FOUND: 404,
  RESOURCE_NOT_FOUND: 404,
  PATIENT_NOT_FOUND: 404,
  DOCTOR_NOT_FOUND: 404,
  HOSPITAL_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  APPOINTMENT_NOT_FOUND: 404,
  CONSULTATION_NOT_FOUND: 404,
  PRESCRIPTION_NOT_FOUND: 404,
  MEDICINE_NOT_FOUND: 404,
  LAB_ORDER_NOT_FOUND: 404,
  LAB_RESULT_NOT_FOUND: 404,
  INVOICE_NOT_FOUND: 404,
  WARD_NOT_FOUND: 404,
  BED_NOT_FOUND: 404,
  ADMISSION_NOT_FOUND: 404,

  // 409 Conflict
  CONFLICT: 409,
  DUPLICATE_ENTRY: 409,
  RESOURCE_ALREADY_EXISTS: 409,
  EMAIL_ALREADY_EXISTS: 409,
  PATIENT_DUPLICATE_MRN: 409,
  DOCTOR_DUPLICATE_REGISTRATION: 409,
  APPOINTMENT_SLOT_CONFLICT: 409,
  APPOINTMENT_DOUBLE_BOOKING: 409,
  APPOINTMENT_OVERLAP: 409,
  APPOINTMENT_SLOT_FULL: 409,
  PRESCRIPTION_ALLERGY_CONFLICT: 409,
  PRESCRIPTION_ALREADY_DISPENSED: 409,
  INVOICE_ALREADY_PAID: 409,
  INVOICE_DUPLICATE_NUMBER: 409,
  ADMISSION_ALREADY_ACTIVE: 409,
  ADMISSION_ALREADY_DISCHARGED: 409,
  BED_OCCUPIED: 409,
  MEDICINE_OUT_OF_STOCK: 409,
  MEDICINE_INSUFFICIENT_QUANTITY: 409,
  WARD_FULL: 409,
  NO_AVAILABLE_BEDS: 409,

  // 429 Too Many Requests
  RATE_LIMIT_EXCEEDED: 429,
  TOO_MANY_LOGIN_ATTEMPTS: 429,
  ACCOUNT_LOCKED: 429,

  // 500 Internal Server Error
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  PAYMENT_GATEWAY_ERROR: 502,
  SMS_SERVICE_ERROR: 502,
  EMAIL_SERVICE_ERROR: 502,
  EXTERNAL_API_ERROR: 502,
};

/**
 * Error Descriptions for Frontend
 * Friendly messages to display to users
 */
const ERROR_DESCRIPTIONS = {
  PATIENT_NOT_FOUND: 'Patient record not found. Please check the patient ID.',
  DOCTOR_NOT_FOUND: 'Doctor not found. Please contact administration.',
  APPOINTMENT_NOT_FOUND: 'Appointment not found.',
  APPOINTMENT_SLOT_UNAVAILABLE: 'The selected time slot is not available. Please choose another.',
  APPOINTMENT_DOUBLE_BOOKING: 'Patient already has an appointment at this time.',
  MEDICINE_OUT_OF_STOCK: 'The prescribed medicine is currently out of stock.',
  PRESCRIPTION_EXPIRED: 'This prescription has expired and cannot be dispensed.',
  PATIENT_ALLERGY_WARNING: 'WARNING: Patient has allergy to this medicine.',
  NO_AVAILABLE_BEDS: 'No available beds in the selected ward.',
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please login again.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
  ACCOUNT_LOCKED: 'Your account has been locked due to multiple failed login attempts. Please try again later.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait before trying again.',
};

/**
 * Get HTTP status code for error code
 * Usage: const status = getStatusCode('PATIENT_NOT_FOUND')
 */
function getStatusCode(errorCode) {
  return ERROR_STATUS_CODES[errorCode] || 500;
}

/**
 * Get description for error code
 * Usage: const msg = getDescription('PATIENT_NOT_FOUND')
 */
function getDescription(errorCode) {
  return ERROR_DESCRIPTIONS[errorCode] || 'An error occurred. Please try again.';
}

/**
 * Check if error code exists
 */
function isValidErrorCode(errorCode) {
  return ERROR_CODES.hasOwnProperty(errorCode);
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  ERROR_CODES,
  ERROR_STATUS_CODES,
  ERROR_DESCRIPTIONS,

  getStatusCode,
  getDescription,
  isValidErrorCode,
};