const { randomUUID: uuidv4 } = require('crypto');
const EncryptionService = require('./encryption');

// Mock audit logs storage
const mockAuditLogs = [];

class AuditLogger {
  /**
   * Sensitive fields that should be masked in logs
   */
  static SENSITIVE_FIELDS = [
    'password', 'passwordHash', 'token', 'jwt',
    'ssn', 'aadhaar', 'pan', 'bankAccount',
    'creditCard', 'cvv', 'pin',
    'email', 'phone', 'address'
  ];

  /**
   * Mask sensitive data in objects
   */
  static maskSensitiveFields(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const masked = { ...obj };

    Object.keys(masked).forEach(key => {
      // Check if key is sensitive
      if (this.SENSITIVE_FIELDS.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        masked[key] = EncryptionService.maskSensitiveData(masked[key]);
      }

      // Recursively mask nested objects
      if (typeof masked[key] === 'object') {
        masked[key] = this.maskSensitiveFields(masked[key]);
      }
    });

    return masked;
  }

  /**
   * Create audit log entry (async to support .catch on call site)
   */
  static async logAction(params = {}) {
    try {
      const userId = params.userId || params.user_id;
      const action = params.action;
      const resource = params.resource || params.resource_type || 'unknown';
      const resourceId = params.resourceId || params.resource_id;
      const method = params.method;
      const statusCode = params.statusCode || params.status_code;
      const ipAddress = params.ipAddress || params.ip_address;
      const requestBody = params.requestBody || params.request_body || {};
      const responseData = params.responseData || params.response_data || {};
      const error = params.error || null;

      const logEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        userId,
        action, // 'CREATE', 'READ', 'UPDATE', 'DELETE'
        resource, // 'patient', 'doctor', 'invoice'
        resourceId,
        method,
        statusCode,
        ipAddress,
        
        // Mask sensitive data before logging
        requestBody: this.maskSensitiveFields(requestBody),
        responseData: this.maskSensitiveFields(responseData),
        
        error: error ? {
          message: error.message,
          code: error.code
        } : null,
        
        // For compliance
        compliance: {
          hipaaRelevant: this.isHIPAARelevant(resource),
          piiPresent: this.containsPII(responseData),
          encrypted: true
        }
      };

      // Store audit log (would be database in Week 6)
      mockAuditLogs.push(logEntry);

      // Log to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUDIT] ${action} ${resource}/${resourceId} by ${userId}`);
      }

      return logEntry;
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw - audit failure shouldn't break app
    }
  }

  /**
   * Check if resource is HIPAA-relevant (patient data)
   */
  static isHIPAARelevant(resource) {
    if (!resource || typeof resource !== 'string') return false;
    const hipaaResources = [
      'patient', 'appointment', 'prescription',
      'lab', 'billing', 'medical', 'health'
    ];

    return hipaaResources.some(r => 
      resource.toLowerCase().includes(r)
    );
  }

  /**
   * Check if response contains PII
   */
  static containsPII(data) {
    if (!data || typeof data !== 'object') return false;

    const piiPatterns = {
      ssn: /\d{3}-\d{2}-\d{4}/,
      email: /[^\s@]+@[^\s@]+\.[^\s@]+/,
      phone: /\d{10}/,
      creditCard: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/
    };

    const jsonStr = JSON.stringify(data);

    return Object.values(piiPatterns).some(pattern =>
      pattern.test(jsonStr)
    );
  }

  /**
   * Get audit logs (for compliance officers)
   */
  static getAuditLogs(filter = {}) {
    let logs = mockAuditLogs;

    if (filter.userId) {
      logs = logs.filter(l => l.userId === filter.userId);
    }

    if (filter.resource) {
      logs = logs.filter(l => l.resource === filter.resource);
    }

    if (filter.startDate && filter.endDate) {
      logs = logs.filter(l =>
        l.timestamp >= new Date(filter.startDate) &&
        l.timestamp <= new Date(filter.endDate)
      );
    }

    return logs;
  }

  /**
   * Generate compliance report
   */
  static getComplianceReport(startDate, endDate) {
    const logs = this.getAuditLogs({ startDate, endDate });

    return {
      period: { startDate, endDate },
      totalActions: logs.length,
      hipaaActions: logs.filter(l => l.compliance.hipaaRelevant).length,
      piiExposures: logs.filter(l => l.compliance.piiPresent).length,
      errorCount: logs.filter(l => l.error).length,
      uniqueUsers: new Set(logs.map(l => l.userId)).size,
      actionsByType: logs.reduce((acc, l) => {
        acc[l.action] = (acc[l.action] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

module.exports = AuditLogger;