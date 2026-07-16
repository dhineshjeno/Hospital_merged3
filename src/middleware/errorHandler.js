// src/middleware/errorHandler.js
// Centralized error handling middleware
// Hospital-grade error handling with security logging

const auditLogger = require('../utils/auditLogger');

/**
 * Custom error class for standardized error handling
 */
class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error Handler Middleware
 * Catches all errors and formats responses consistently
 * 
 * Usage:
 * - Must be the LAST middleware in server.js
 * - All errors should be passed with next(error)
 */
const errorHandler = (err, req, res, next) => {
  // Default error values
  let error = err;
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // =========================================================================
  // ERROR TYPE HANDLING
  // =========================================================================

  // 1. Validation Error (Joi/Express validation)
  if (err.name === 'ValidationError' || err.details) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
  }

  // 2. Database Error
  if (err.code && typeof err.code === 'string') {
    // PostgreSQL error codes
    if (err.code === '23505') {
      // Unique violation
      statusCode = 409;
      code = 'DUPLICATE_ENTRY';
      message = 'This record already exists';
    } else if (err.code === '23503') {
      // Foreign key violation
      statusCode = 409;
      code = 'FOREIGN_KEY_VIOLATION';
      message = 'Referenced record does not exist';
    } else if (err.code === '23502') {
      // NOT NULL violation
      statusCode = 400;
      code = 'NOT_NULL_VIOLATION';
      message = 'Required field missing';
    } else if (err.code === '42P01') {
      // Undefined table
      statusCode = 500;
      code = 'DATABASE_ERROR';
      message = 'Database table error';
    }
  }

  // 3. MongoDB/Database errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    statusCode = 500;
    code = 'DATABASE_ERROR';
  }

  // 4. JWT/Authentication Error
  if (err.name === 'JsonWebTokenError' || err.code === 'INVALID_TOKEN') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid or expired authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // 5. Syntax Error
  if (err.name === 'SyntaxError') {
    statusCode = 400;
    code = 'SYNTAX_ERROR';
    message = 'Invalid request format';
  }

  // 6. Type Error
  if (err.name === 'TypeError') {
    statusCode = 500;
    code = 'INTERNAL_ERROR';
    message = 'Internal server error';
  }

  // 7. Authentication Errors
  if (err.statusCode === 401) {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = message || 'Authentication required';
  }

  // 8. Authorization Errors
  if (err.statusCode === 403) {
    statusCode = 403;
    code = 'FORBIDDEN';
    message = message || 'Access denied';
  }

  // 9. Not Found Errors
  if (err.statusCode === 404) {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = message || 'Resource not found';
  }

  // =========================================================================
  // SECURITY LOGGING
  // =========================================================================

  const auditData = {
    action: 'ERROR',
    resource_type: 'system',
    user_id: req.user ? req.user.userId : null,
    hospital_id: req.hospitalId || null,
    error_code: code,
    status_code: statusCode,
    path: req.path,
    method: req.method,
    ip_address: req.ip || req.connection.remoteAddress,
  };

  // Log to audit trail (with detailed error logging in development)
  if (process.env.NODE_ENV === 'development') {
    auditData.error_message = message;
    auditData.error_stack = err.stack;
    console.error('❌ ERROR:', {
      code,
      statusCode,
      message,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Production: Log only essential info
    auditData.error_message = 'Check server logs';
    console.error(`[${code}] ${statusCode} ${message} - ${req.method} ${req.path}`);
  }

  // Log to audit system
  try {
    auditLogger.logAction(auditData).catch(() => {
      // Fail silently if audit logging fails
    });
  } catch (auditError) {
    // Prevent audit errors from breaking error handling
  }

  // =========================================================================
  // SECURITY: Don't expose sensitive information
  // =========================================================================

  const responseError = {
    success: false,
    code,
    message,
    timestamp: new Date().toISOString(),
  };

  // Only include error details in development
  if (process.env.NODE_ENV === 'development') {
    responseError.details = err.details || null;
    responseError.stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;
  }

  // Prevent exposing database schema or internal details
  if (err.detail) {
    // PostgreSQL error details - don't expose in production
    if (process.env.NODE_ENV === 'development') {
      responseError.details = { dbDetail: err.detail };
    }
  }

  // =========================================================================
  // RESPONSE HEADERS (Security)
  // =========================================================================

  // Ensure proper headers are sent
  res.set('Content-Type', 'application/json');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');

  // =========================================================================
  // SEND RESPONSE
  // =========================================================================

  res.status(statusCode).json(responseError);
};

/**
 * Express error wrapper
 * Wraps async route handlers to catch errors
 * 
 * Usage:
 * router.get('/', catchAsync(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 Not Found handler
 * Call this before errorHandler middleware
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

/**
 * Helper: Throw standardized error
 */
function throwError(message, statusCode = 500, code = null, details = null) {
  throw new AppError(message, statusCode, code, details);
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  AppError,
  errorHandler,
  catchAsync,
  notFoundHandler,
  throwError,
};