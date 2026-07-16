// src/utils/ApiError.js
// Standardized error handling class
// Used throughout the application for consistent error responses

/**
 * Custom Error Class for API Responses
 * 
 * Usage:
 * throw ApiError.badRequest('Email is required');
 * throw ApiError.notFound('Patient not found');
 * throw ApiError.forbidden('Access denied');
 * throw ApiError.conflict('Patient with this email already exists');
 */
class ApiError extends Error {
  constructor(message, statusCode, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  // =========================================================================
  // STATIC METHODS FOR COMMON HTTP ERRORS
  // =========================================================================

  /**
   * 400 Bad Request
   * Invalid input, missing fields, validation errors
   */
  static badRequest(message, code = 'BAD_REQUEST') {
    return new ApiError(message, 400, code);
  }

  /**
   * 401 Unauthorized
   * Missing or invalid authentication
   */
  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(message, 401, code);
  }

  /**
   * 403 Forbidden
   * Authenticated but not authorized for this action
   */
  static forbidden(message = 'Access denied', code = 'FORBIDDEN') {
    return new ApiError(message, 403, code);
  }

  /**
   * 404 Not Found
   * Resource does not exist
   */
  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(message, 404, code);
  }

  /**
   * 409 Conflict
   * Resource already exists, duplicate entry
   */
  static conflict(message = 'Resource already exists', code = 'CONFLICT') {
    return new ApiError(message, 409, code);
  }

  /**
   * 422 Unprocessable Entity
   * Validation failed, data cannot be processed
   */
  static unprocessable(message = 'Unprocessable entity', code = 'UNPROCESSABLE') {
    return new ApiError(message, 422, code);
  }

  /**
   * 429 Too Many Requests
   * Rate limit exceeded
   */
  static tooManyRequests(message = 'Too many requests. Please try again later.', code = 'RATE_LIMIT_EXCEEDED') {
    return new ApiError(message, 429, code);
  }

  /**
   * 500 Internal Server Error
   * Unexpected server error
   */
  static internalServerError(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new ApiError(message, 500, code);
  }

  /**
   * 503 Service Unavailable
   * Server temporarily unavailable
   */
  static serviceUnavailable(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(message, 503, code);
  }

  // =========================================================================
  // BUSINESS LOGIC ERRORS (Hospital-specific)
  // =========================================================================

  /**
   * Patient not found in hospital
   */
  static patientNotFound(hospitalId, patientId) {
    return new ApiError(
      `Patient ${patientId} not found in hospital ${hospitalId}`,
      404,
      'PATIENT_NOT_FOUND'
    );
  }

  /**
   * Doctor not found in hospital
   */
  static doctorNotFound(hospitalId, doctorId) {
    return new ApiError(
      `Doctor ${doctorId} not found in hospital ${hospitalId}`,
      404,
      'DOCTOR_NOT_FOUND'
    );
  }

  /**
   * Appointment not found
   */
  static appointmentNotFound(appointmentId) {
    return new ApiError(
      `Appointment ${appointmentId} not found`,
      404,
      'APPOINTMENT_NOT_FOUND'
    );
  }

  /**
   * Appointment slot unavailable
   */
  static appointmentSlotUnavailable() {
    return new ApiError(
      'Selected time slot is not available',
      409,
      'APPOINTMENT_SLOT_UNAVAILABLE'
    );
  }

  /**
   * Patient has existing appointment at same time
   */
  static appointmentConflict() {
    return new ApiError(
      'Patient already has an appointment at this time',
      409,
      'APPOINTMENT_CONFLICT'
    );
  }

  /**
   * No available beds in ward
   */
  static noAvailableBeds() {
    return new ApiError(
      'No available beds in the requested ward',
      409,
      'NO_AVAILABLE_BEDS'
    );
  }

  /**
   * Medicine out of stock
   */
  static medicineOutOfStock(medicineName) {
    return new ApiError(
      `${medicineName} is out of stock`,
      409,
      'MEDICINE_OUT_OF_STOCK'
    );
  }

  /**
   * Insufficient medicine quantity
   */
  static insufficientMedicineQuantity(medicineName, required, available) {
    return new ApiError(
      `Insufficient ${medicineName}. Required: ${required}, Available: ${available}`,
      409,
      'INSUFFICIENT_MEDICINE_QUANTITY'
    );
  }

  /**
   * Patient has allergies to prescribed medicine
   */
  static allergyWarning(allergen) {
    return new ApiError(
      `Patient is allergic to ${allergen}. Prescription cannot be issued.`,
      409,
      'ALLERGY_WARNING'
    );
  }

  /**
   * Cross-hospital access attempt
   */
  static crossHospitalAccess() {
    return new ApiError(
      'You do not have access to this hospital',
      403,
      'CROSS_HOSPITAL_ACCESS'
    );
  }

  /**
   * Invalid hospital ID
   */
  static invalidHospitalId() {
    return new ApiError(
      'Invalid hospital ID format',
      400,
      'INVALID_HOSPITAL_ID'
    );
  }

  /**
   * User does not belong to hospital
   */
  static userNotInHospital() {
    return new ApiError(
      'User does not belong to this hospital',
      403,
      'USER_NOT_IN_HOSPITAL'
    );
  }

  /**
   * Invalid role for action
   */
  static invalidRole(requiredRole) {
    return new ApiError(
      `This action requires ${requiredRole} role`,
      403,
      'INVALID_ROLE'
    );
  }

  /**
   * Prescription expired
   */
  static prescriptionExpired() {
    return new ApiError(
      'This prescription has expired and cannot be dispensed',
      409,
      'PRESCRIPTION_EXPIRED'
    );
  }

  /**
   * Invoice already paid
   */
  static invoiceAlreadyPaid() {
    return new ApiError(
      'This invoice has already been paid',
      409,
      'INVOICE_ALREADY_PAID'
    );
  }

  /**
   * Payment amount mismatch
   */
  static paymentMismatch(expected, received) {
    return new ApiError(
      `Payment amount mismatch. Expected: ${expected}, Received: ${received}`,
      400,
      'PAYMENT_MISMATCH'
    );
  }

  /**
   * Database error
   */
  static databaseError(message = 'Database operation failed') {
    return new ApiError(message, 500, 'DATABASE_ERROR');
  }

  /**
   * Email already registered
   */
  static emailAlreadyExists(email) {
    return new ApiError(
      `Email ${email} is already registered`,
      409,
      'EMAIL_ALREADY_EXISTS'
    );
  }

  /**
   * Invalid credentials
   */
  static invalidCredentials() {
    return new ApiError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS'
    );
  }

  /**
   * Account locked (too many login attempts)
   */
  static accountLocked() {
    return new ApiError(
      'Account locked due to multiple failed login attempts. Please try again later.',
      429,
      'ACCOUNT_LOCKED'
    );
  }

  /**
   * Token expired
   */
  static tokenExpired() {
    return new ApiError(
      'Authentication token has expired. Please login again.',
      401,
      'TOKEN_EXPIRED'
    );
  }

  /**
   * Invalid token
   */
  static invalidToken() {
    return new ApiError(
      'Invalid or malformed authentication token',
      401,
      'INVALID_TOKEN'
    );
  }

  // =========================================================================
  // CONVERT TO JSON RESPONSE
  // =========================================================================

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      success: false,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    };
  }

  /**
   * Get error details for logging
   */
  getDetails() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

module.exports = ApiError;