const { randomUUID: uuidv4 } = require('crypto');

// Mock consent records
const mockConsents = [];

class ConsentService {
  /**
   * Create consent record (HIPAA requirement)
   */
  static async recordConsent({
    patientId,
    consentType, // 'treatment', 'data_processing', 'third_party_sharing'
    grantedBy,
    details
  }) {
    const consent = {
      id: uuidv4(),
      patientId,
      consentType,
      grantedBy,
      details,
      dateCreated: new Date(),
      dateExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'active' // active, revoked, expired
    };

    mockConsents.push(consent);
    return consent;
  }

  /**
   * Check if patient has valid consent
   */
  static async hasConsent(patientId, consentType) {
    return mockConsents.some(c =>
      c.patientId === patientId &&
      c.consentType === consentType &&
      c.status === 'active' &&
      new Date(c.dateExpiry) > new Date()
    );
  }

  /**
   * Revoke consent
   */
  static async revokeConsent(consentId) {
    const consent = mockConsents.find(c => c.id === consentId);
    if (consent) {
      consent.status = 'revoked';
      consent.dateRevoked = new Date();
    }
    return consent;
  }

  /**
   * Get consent history for patient
   */
  static async getConsentHistory(patientId) {
    return mockConsents.filter(c => c.patientId === patientId);
  }
}

module.exports = ConsentService;