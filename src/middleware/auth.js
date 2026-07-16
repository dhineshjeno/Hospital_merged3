// src/middleware/auth.js
// Enhanced Authentication Middleware
// JWT token validation with hospital scoping and role extraction
// Hospital-grade security with comprehensive logging

const jwt = require('jsonwebtoken');
const AppError = require('../utils/ApiError');
const auditLogger = require('../utils/auditLogger');

// ============================================================================
// TOKEN VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Middleware: Validate JWT token and extract user information
 * 
 * Expected header: Authorization: Bearer <token>
 * 
 * Sets req.user with:
 * - userId
 * - email
 * - hospitalId
 * - role
 * - permissions
 * 
 * Usage: app.use(authenticateToken)
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    // =========================================================================
    // 1. EXTRACT TOKEN FROM HEADER
    // =========================================================================

    if (!authHeader) {
      auditLogger.logAction({
        action: 'AUTH_FAILED',
        resource_type: 'authentication',
        status: 'failed',
        error_message: 'Missing authorization header',
        ip_address: req.ip,
        path: req.path,
        method: req.method,
      }).catch(() => {});

      throw AppError.unauthorized('Authorization header missing');
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      auditLogger.logAction({
        action: 'AUTH_FAILED',
        resource_type: 'authentication',
        status: 'failed',
        error_message: 'Invalid authorization header format',
        ip_address: req.ip,
        path: req.path,
        method: req.method,
      }).catch(() => {});

      throw AppError.unauthorized('Invalid authorization header format. Use: Bearer <token>');
    }

    const token = parts[1];

    // =========================================================================
    // 2. VERIFY TOKEN SIGNATURE
    // =========================================================================

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        auditLogger.logAction({
          action: 'AUTH_FAILED',
          resource_type: 'authentication',
          status: 'failed',
          error_message: 'Token expired',
          ip_address: req.ip,
          path: req.path,
          method: req.method,
        }).catch(() => {});

        throw AppError.tokenExpired();
      }

      if (error.name === 'JsonWebTokenError') {
        auditLogger.logAction({
          action: 'AUTH_FAILED',
          resource_type: 'authentication',
          status: 'failed',
          error_message: 'Invalid token signature',
          ip_address: req.ip,
          path: req.path,
          method: req.method,
        }).catch(() => {});

        throw AppError.invalidToken();
      }

      throw error;
    }

    // =========================================================================
    // 3. VALIDATE TOKEN STRUCTURE
    // =========================================================================

    if (!decoded.userId || !decoded.email || !decoded.hospitalId || !decoded.role) {
      auditLogger.logAction({
        action: 'AUTH_FAILED',
        resource_type: 'authentication',
        status: 'failed',
        error_message: 'Token missing required fields',
        ip_address: req.ip,
        path: req.path,
        method: req.method,
      }).catch(() => {});

      throw AppError.invalidToken();
    }

    // =========================================================================
    // 4. EXTRACT USER DATA FROM TOKEN
    // =========================================================================

    const user = {
      userId: decoded.userId,
      email: decoded.email,
      hospitalId: decoded.hospitalId,
      role: decoded.role,
      permissions: decoded.permissions || [], // Role-based permissions
      tokenIssuedAt: new Date(decoded.iat * 1000),
      tokenExpiresAt: new Date(decoded.exp * 1000),
    };

    // =========================================================================
    // 5. VALIDATE HOSPITAL ID IN TOKEN
    // =========================================================================

    const hospitalIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!hospitalIdRegex.test(user.hospitalId)) {
      auditLogger.logAction({
        action: 'AUTH_FAILED',
        resource_type: 'authentication',
        status: 'failed',
        error_message: 'Invalid hospital ID in token',
        user_id: user.userId,
        ip_address: req.ip,
        path: req.path,
        method: req.method,
      }).catch(() => {});

      throw AppError.invalidHospitalId();
    }

    // =========================================================================
    // 6. ATTACH USER TO REQUEST
    // =========================================================================

    req.user = user;
    req.hospitalId = user.hospitalId; // Make it easily accessible

    // =========================================================================
    // 7. LOG SUCCESSFUL AUTHENTICATION
    // =========================================================================

    auditLogger.logAction({
      action: 'AUTH_SUCCESS',
      resource_type: 'authentication',
      user_id: user.userId,
      hospital_id: user.hospitalId,
      status: 'success',
      ip_address: req.ip,
      path: req.path,
      method: req.method,
    }).catch(() => {});

    next();
  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
};

// ============================================================================
// OPTIONAL AUTHENTICATION (Public endpoints)
// ============================================================================

/**
 * Middleware: Optional authentication - proceed even without token
 * Useful for: Public endpoints, Health checks, etc.
 * 
 * Sets req.user if token provided, otherwise sets req.user = null
 * 
 * Usage: app.get('/public-endpoint', optionalAuth, controller)
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    // No token provided - continue without authentication
    if (!authHeader) {
      req.user = null;
      return next();
    }

    // Token provided - validate it
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      req.user = null;
      return next();
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Validate required fields
      if (decoded.userId && decoded.email && decoded.hospitalId && decoded.role) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          hospitalId: decoded.hospitalId,
          role: decoded.role,
          permissions: decoded.permissions || [],
        };
        req.hospitalId = decoded.hospitalId;
      }
    } catch (error) {
      // Ignore token validation errors for optional auth
      req.user = null;
    }

    next();
  } catch (error) {
    // Fail silently for optional auth
    req.user = null;
    next();
  }
};

// ============================================================================
// VERIFY HOSPITAL MATCH
// ============================================================================

/**
 * Middleware: Verify user's hospital matches request hospital
 * 
 * Usage: app.use(verifyHospitalMatch())
 */
const verifyHospitalMatch = () => {
  return (req, res, next) => {
    if (!req.user) {
      // No user, skip check
      return next();
    }

    if (!req.hospitalId) {
      // No hospital ID in header, skip check
      return next();
    }

    // User's hospital must match requested hospital
    if (req.user.hospitalId !== req.hospitalId) {
      auditLogger.logAction({
        action: 'AUTH_FAILED',
        resource_type: 'hospital_verification',
        user_id: req.user.userId,
        status: 'failed',
        error_message: `Hospital mismatch. User: ${req.user.hospitalId}, Requested: ${req.hospitalId}`,
        ip_address: req.ip,
        path: req.path,
        method: req.method,
      }).catch(() => {});

      throw AppError.crossHospitalAccess();
    }

    next();
  };
};

// ============================================================================
// TOKEN GENERATION (For login responses)
// ============================================================================

/**
 * Generate JWT token for authenticated user
 * 
 * Usage:
 * const token = generateToken({
 *   userId: user.user_id,
 *   email: user.email,
 *   hospitalId: user.hospital_id,
 *   role: user.role,
 *   permissions: ['read:patients', 'create:appointments']
 * });
 */
function generateToken(payload) {
  if (!payload.userId || !payload.email || !payload.hospitalId || !payload.role) {
    throw new Error('Missing required fields for token generation');
  }

  const token = jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      hospitalId: payload.hospitalId,
      role: payload.role,
      permissions: payload.permissions || [],
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRY || '24h',
      issuer: 'hospital-management-system',
      subject: payload.userId,
    }
  );

  return token;
}

// ============================================================================
// TOKEN REFRESH
// ============================================================================

/**
 * Generate new token from existing token
 * 
 * Usage: Used in refresh token endpoint
 */
function refreshToken(oldToken) {
  try {
    // Verify even if expired (to allow refresh)
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });

    if (!decoded.userId) {
      throw new Error('Invalid token');
    }

    // Generate new token with same payload
    return generateToken({
      userId: decoded.userId,
      email: decoded.email,
      hospitalId: decoded.hospitalId,
      role: decoded.role,
      permissions: decoded.permissions,
    });
  } catch (error) {
    throw AppError.invalidToken();
  }
}

// ============================================================================
// HELPER: Verify user role and permissions
// ============================================================================

/**
 * Check if user has required role
 * 
 * Usage: if (hasRole(req.user, 'doctor')) { ... }
 */
function hasRole(user, requiredRole) {
  return user && user.role === requiredRole;
}

/**
 * Check if user has any of the required roles
 * 
 * Usage: if (hasAnyRole(req.user, ['admin', 'doctor'])) { ... }
 */
function hasAnyRole(user, requiredRoles) {
  return user && requiredRoles.includes(user.role);
}

/**
 * Check if user has specific permission
 * 
 * Usage: if (hasPermission(req.user, 'read:patients')) { ... }
 */
function hasPermission(user, requiredPermission) {
  return user && user.permissions && user.permissions.includes(requiredPermission);
}

/**
 * Check if user has any of the required permissions
 */
function hasAnyPermission(user, requiredPermissions) {
  if (!user || !user.permissions) return false;
  return requiredPermissions.some((perm) => user.permissions.includes(perm));
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  // Middleware
  authenticateToken,
  optionalAuth,
  verifyHospitalMatch,

  // Token operations
  generateToken,
  refreshToken,

  // Helper functions
  hasRole,
  hasAnyRole,
  hasPermission,
  hasAnyPermission,
};