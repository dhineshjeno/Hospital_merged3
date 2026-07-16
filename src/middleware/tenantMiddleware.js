/**
 * Multi-tenancy middleware — REPLACEMENT. Exports are unchanged:
 *   { tenantMiddleware, verifyTenantAccess }
 *
 * WHAT CHANGED (security-critical):
 *   The old version fell back to a DEFAULT hospital
 *   ('00000000-0000-0000-0000-000000000001') whenever no x-hospital-id header
 *   was present — and the frontend never sends that header. Result: all traffic
 *   silently landed on one hospital's data. Tenancy now derives from the
 *   VERIFIED JWT (set by authenticateToken as req.user.hospitalId). A header,
 *   if present, is only a cross-check and must match the token.
 *
 * ORDERING REQUIREMENT:
 *   This middleware must run AFTER authenticateToken (it needs req.user).
 *   The replacement server.js mounts it correctly:
 *     app.use('/api/v1/auth', authRoutes);                    // public
 *     app.use('/api/v1', authenticateToken, tenantMiddleware); // guard
 *     app.use('/api/v1/patients', patientRoutes);              // protected
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid) {
  return typeof uuid === 'string' && UUID_RE.test(uuid);
}

const tenantMiddleware = (req, res, next) => {
  // Must run after authentication. If req.user is absent here, the middleware
  // chain is mis-ordered — fail closed and say so, never guess a hospital.
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required before tenant resolution',
        statusCode: 401,
      },
    });
  }

  const tokenHospitalId = req.user.hospitalId;
  if (!isValidUUID(tokenHospitalId)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_MISSING',
        message: 'Token carries no valid hospital context',
        statusCode: 403,
      },
    });
  }

  // Optional cross-check: a client-sent header must match the token. The token
  // is the source of truth; the header can never widen access.
  const headerHospitalId = req.headers['x-hospital-id'];
  if (headerHospitalId && headerHospitalId !== tokenHospitalId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CROSS_HOSPITAL_ACCESS',
        message: 'Hospital context mismatch',
        statusCode: 403,
      },
    });
  }

  req.hospitalId = tokenHospitalId;
  return next();
};

/**
 * verifyTenantAccess — unchanged contract; kept for routes that already use it.
 * With JWT-derived tenancy these can no longer diverge, so this is defense in
 * depth rather than the primary control.
 */
const verifyTenantAccess = (req, res, next) => {
  const userHospitalId = req.user?.hospitalId;
  if (userHospitalId && req.hospitalId && userHospitalId !== req.hospitalId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CROSS_HOSPITAL_ACCESS',
        message: "You do not have access to this hospital's data",
        statusCode: 403,
      },
    });
  }
  return next();
};

module.exports = {
  tenantMiddleware,
  verifyTenantAccess,
};
