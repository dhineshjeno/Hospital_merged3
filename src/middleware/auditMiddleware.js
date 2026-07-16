const AuditLogger = require('../utils/auditLogger');

/**
 * Middleware to automatically log all API requests
 */
const auditMiddleware = (req, res, next) => {
  // Extract user info from JWT (set by auth middleware)
  const userId = req.user?.id || 'anonymous';

  // Get client IP
  const ipAddress = req.ip || 
    req.headers['x-forwarded-for'] || 
    req.connection.remoteAddress;

  // Store original response.json to intercept responses
  const originalJson = res.json.bind(res);

  res.json = function(data) {
    // Log the action
    AuditLogger.logAction({
      userId,
      action: req.method === 'GET' ? 'READ' : 
              req.method === 'POST' ? 'CREATE' :
              req.method === 'PUT' ? 'UPDATE' :
              req.method === 'DELETE' ? 'DELETE' : 'OTHER',
      
      resource: extractResource(req.path),
      resourceId: extractResourceId(req.path),
      
      method: req.method,
      statusCode: res.statusCode,
      ipAddress,
      
      requestBody: req.body,
      responseData: data,
      error: null
    });

    // Call original json function
    return originalJson(data);
  };

  next();
};

/**
 * Helper: Extract resource type from URL
 * /api/v1/patients/123 -> 'patient'
 */
function extractResource(path) {
  const parts = path.split('/');
  // Usually at index 3: /api/v1/{resource}/...
  if (parts[3]) {
    return parts[3].replace(/s$/, ''); // Remove trailing 's'
  }
  return 'unknown';
}

/**
 * Helper: Extract resource ID from URL
 * /api/v1/patients/123 -> '123'
 */
function extractResourceId(path) {
  const parts = path.split('/');
  return parts[4] || 'unknown';
}

module.exports = auditMiddleware;