// src/middleware/hospitalHeaderValidator.js
// Validate Hospital ID on every request
// Critical security: Prevent cross-hospital data access

const { AppError } = require('./errorHandler');
const auditLogger = require('../utils/auditLogger');

// ============================================================================
// HOSPITAL HEADER VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Middleware: Validate x-hospital-id header
 * 
 * CRITICAL: This prevents hospitals from accessing other hospitals' data
 * 
 * Requirements:
 * - Every request MUST have x-hospital-id header
 * - Header value MUST be a valid UUID
 * - User MUST belong to the hospital in the header
 * - Data returned MUST be filtered by hospital_id
 * 
 * Usage: app.use(validateHospitalHeader())
 */
function validateHospitalHeader() {
  return (req, res, next) => {
    let hospitalId = req.headers['x-hospital-id'];

    // Fallback to token's hospitalId if header is missing
    if (!hospitalId && req.user && req.user.hospitalId) {
      hospitalId = req.user.hospitalId;
      req.headers['x-hospital-id'] = hospitalId;
    }

    // =========================================================================
    // 1. CHECK IF HEADER EXISTS
    // =========================================================================

    if (!hospitalId) {
      // Log security incident
      auditLogger.logAction({
        action: 'SECURITY_VIOLATION',
        resource_type: 'hospital_header',
        status: 'failed',
        error_message: 'Missing x-hospital-id header',
        ip_address: req.ip,
        path: req.path,
        method: req.method,
      }).catch(() => {});

      throw new AppError(
        'Hospital ID header (x-hospital-id) is required',
        400,
        'MISSING_HOSPITAL_ID'
      );
    }

    // =========================================================================
    // 2. VALIDATE HOSPITAL ID FORMAT (UUID)
    // =========================================================================

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(hospitalId)) {
      // Log security incident
      auditLogger.logAction({
        action: 'SECURITY_VIOLATION',
        resource_type: 'hospital_header',
        status: 'failed',
        error_message: `Invalid hospital ID format: ${hospitalId}`,
        ip_address: req.ip,
        path: req.path,
        method: req.method,
      }).catch(() => {});

      throw new AppError(
        'Invalid hospital ID format. Must be a valid UUID.',
        400,
        'INVALID_HOSPITAL_ID'
      );
    }

    // =========================================================================
    // 3. IF USER IS AUTHENTICATED: VERIFY USER BELONGS TO HOSPITAL
    // =========================================================================

    if (req.user && req.user.hospitalId) {
      if (req.user.hospitalId !== hospitalId) {
        // Log security incident (potential breach attempt)
        auditLogger.logAction({
          action: 'SECURITY_VIOLATION',
          resource_type: 'hospital_header',
          status: 'failed',
          error_message: `Cross-hospital access attempt. User hospital: ${req.user.hospitalId}, Requested hospital: ${hospitalId}`,
          user_id: req.user.userId,
          ip_address: req.ip,
          path: req.path,
          method: req.method,
        }).catch(() => {});

        throw new AppError(
          'You do not have access to this hospital',
          403,
          'UNAUTHORIZED_HOSPITAL_ACCESS'
        );
      }
    }

    // =========================================================================
    // 4. ATTACH HOSPITAL ID TO REQUEST
    // =========================================================================

    req.hospitalId = hospitalId;

    // =========================================================================
    // 5. LOG FOR AUDIT TRAIL
    // =========================================================================

    auditLogger.logAction({
      action: 'HOSPITAL_ACCESS',
      resource_type: 'hospital_header',
      resource_id: hospitalId,
      user_id: req.user ? req.user.userId : null,
      status: 'success',
      ip_address: req.ip,
      path: req.path,
      method: req.method,
      hospital_id: hospitalId,
    }).catch(() => {});

    next();
  };
}

// ============================================================================
// ENSURE HOSPITAL ID IN ALL DATABASE QUERIES
// ============================================================================

/**
 * Helper: Filter query to include hospital_id
 * 
 * Usage in repository:
 * const query = addHospitalFilter('patients', req.hospitalId);
 * // Returns: "SELECT * FROM patients WHERE hospital_id = $1"
 */
function addHospitalFilter(tableName, hospitalId) {
  if (!hospitalId) {
    throw new Error('Hospital ID is required for data access');
  }

  if (!isValidUUID(hospitalId)) {
    throw new Error('Invalid hospital ID format');
  }

  return {
    tableName,
    hospitalId,
    filter: `${tableName}.hospital_id = '${hospitalId}'`,
  };
}

/**
 * Helper: Validate UUID format
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============================================================================
// PREVENT DATA LEAKAGE: Verify response data belongs to hospital
// ============================================================================

/**
 * Middleware: Verify response data only contains current hospital's data
 * Can be used as a safety check in development
 * 
 * Usage: app.use(verifyResponseHospitalId())
 */
function verifyResponseHospitalId() {
  return (req, res, next) => {
    // Wrap res.json to check hospital_id in response
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Skip verification if no hospital context
      if (!req.hospitalId) {
        return originalJson(data);
      }

      // Check if response contains hospital-scoped data
      if (data && typeof data === 'object') {
        // Check array of items
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item.hospital_id && item.hospital_id !== req.hospitalId) {
              console.error(`❌ DATA LEAK: Response contains wrong hospital data!`);
              console.error(`Expected: ${req.hospitalId}, Got: ${item.hospital_id}`);
              throw new Error('Data integrity violation');
            }
          });
        }

        // Check single item
        if (data.hospital_id && data.hospital_id !== req.hospitalId) {
          console.error(`❌ DATA LEAK: Response contains wrong hospital data!`);
          console.error(`Expected: ${req.hospitalId}, Got: ${data.hospital_id}`);
          throw new Error('Data integrity violation');
        }

        // Check nested data structure
        if (data.data) {
          const nestedCheck = (obj) => {
            if (typeof obj !== 'object' || obj === null) return;
            if (Array.isArray(obj)) {
              obj.forEach(nestedCheck);
            } else if (obj.hospital_id && obj.hospital_id !== req.hospitalId) {
              console.error(`❌ DATA LEAK: Nested response contains wrong hospital data!`);
              throw new Error('Data integrity violation');
            }
          };
          nestedCheck(data.data);
        }
      }

      return originalJson(data);
    };

    next();
  };
}

// ============================================================================
// SAFE QUERY BUILDER (For repositories)
// ============================================================================

/**
 * Build safe SQL with hospital scoping
 * 
 * Usage:
 * const { query, params } = buildSafeQuery(
 *   'SELECT * FROM patients WHERE email = $1',
 *   ['user@example.com'],
 *   hospitalId
 * );
 */
function buildSafeQuery(baseQuery, baseParams = [], hospitalId) {
  if (!isValidUUID(hospitalId)) {
    throw new Error('Invalid hospital ID');
  }

  // Add hospital_id to WHERE clause
  let finalQuery = baseQuery;

  if (finalQuery.includes('WHERE')) {
    finalQuery += ` AND hospital_id = $${baseParams.length + 1}`;
  } else {
    finalQuery += ` WHERE hospital_id = $${baseParams.length + 1}`;
  }

  const finalParams = [...baseParams, hospitalId];

  return {
    query: finalQuery,
    params: finalParams,
    hospitalId,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  validateHospitalHeader,
  addHospitalFilter,
  isValidUUID,
  verifyResponseHospitalId,
  buildSafeQuery,
};