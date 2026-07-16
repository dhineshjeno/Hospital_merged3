/**
 * EncryptionService — AES-256-GCM for PII at rest (Aadhaar, PAN, SSN).
 *
 * REPLACEMENT for the previous version. Public API is IDENTICAL:
 *   encrypt(plaintext) -> { encrypted, iv, authTag } | null
 *   decrypt({ encrypted, iv, authTag }) -> string | null
 *   maskSensitiveData(value, showLast) -> string
 *   hash(data) -> sha256 hex
 *
 * WHAT CHANGED (security-critical):
 *   The old code fell back to crypto.randomBytes(32) when ENCRYPTION_KEY was
 *   missing. That means: app boots fine, encrypts patient data with a key that
 *   only exists in RAM, and after the next restart that data is PERMANENTLY
 *   UNRECOVERABLE. It also breaks multi-instance deployments. Key handling now
 *   fails closed: no valid key => the process will not start.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || !/^[0-9a-f]{64}$/i.test(ENCRYPTION_KEY)) {
  throw new Error(
    'FATAL: ENCRYPTION_KEY must be exactly 64 hex characters (256-bit key). ' +
      'Never fall back to a generated key — encrypted data would be lost on restart. ' +
      'Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');

class EncryptionService {
  /**
   * Encrypt sensitive data. Fresh random IV per call (never reuse IVs with GCM).
   * Returns: { encrypted: string, iv: string, authTag: string }
   */
  static encrypt(plaintext) {
    if (plaintext === null || plaintext === undefined || plaintext === '') return null;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);

    let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    };
  }

  /**
   * Decrypt sensitive data. Throws on tampered ciphertext (GCM auth failure) —
   * callers must treat a decryption failure as a security event, not swallow it.
   */
  static decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      KEY_BUFFER,
      Buffer.from(encryptedData.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Mask sensitive data for display: '123456789012' -> '********9012'
   */
  static maskSensitiveData(value, showLast = 4) {
    if (!value) return null;
    const str = String(value);
    if (str.length <= showLast) return '****';
    return '*'.repeat(str.length - showLast) + str.slice(-showLast);
  }

  /**
   * One-way hash (for lookups/comparison, NOT for passwords — passwords use bcrypt).
   */
  static hash(data) {
    return crypto.createHash('sha256').update(String(data)).digest('hex');
  }
}

module.exports = EncryptionService;
