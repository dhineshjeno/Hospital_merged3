class Sanitizer {
  /**
   * Remove/escape dangerous characters
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    // Remove script tags
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Escape HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  /**
   * Sanitize entire request body
   */
  static sanitizeRequestBody(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};

    Object.keys(obj).forEach(key => {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeRequestBody(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone (India format)
   */
  static isValidPhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/; // Indian numbers
    return phoneRegex.test(phone.replace(/\D/g, ''));
  }

  /**
   * Validate UUID
   */
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Limit string length to prevent DoS
   */
  static limitLength(str, maxLength = 1000) {
    if (typeof str !== 'string') return str;
    return str.substring(0, maxLength);
  }
}

module.exports = Sanitizer;