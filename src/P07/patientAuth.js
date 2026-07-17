/**
 * STUB PATIENT AUTH — P3-07 unblock only.
 * Patients set a 6-digit PIN tied to their patient_id.
 * On login they get a short-lived JWT they send on portal requests.
 *
 * NOTE FOR PERSON 2 INTEGRATION:
 * When the unified auth system arrives, replace this with:
 *   - patientAuthService.registerPin() → Person 2's user registration
 *   - patientAuthService.login() → Person 2's login endpoint
 *   - patientAuthMiddleware → Person 2's JWT middleware
 * The portal controllers only depend on req.patientId being set by
 * middleware -- swap the middleware, the controllers need no changes.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { ApiError } = require('../utils/ApiError');

const JWT_SECRET = process.env.PATIENT_JWT_SECRET || 'stub-patient-secret-replace-in-production';
const JWT_EXPIRY = '8h';
const PIN_REGEX = /^\d{6}$/;

async function setPatientPin(patientId, pin) {
  if (!PIN_REGEX.test(pin)) {
    throw ApiError.badRequest('PIN must be exactly 6 digits.');
  }
  const hash = await bcrypt.hash(pin, 10);
  const result = await query(
    `UPDATE patients SET patient_pin_hash = $1, updated_at = now()
     WHERE patient_id = $2 AND status = 'active'
     RETURNING patient_id, first_name, last_name, email, phone`,
    [hash, patientId],
  );
  if (!result.rows[0]) {
    throw ApiError.notFound('Patient not found or not active.');
  }
  return result.rows[0];
}

async function loginPatient(identifier, pin) {
  // identifier = phone OR email
  if (!identifier) throw ApiError.badRequest('phone or email is required.');
  if (!PIN_REGEX.test(pin)) throw ApiError.badRequest('PIN must be exactly 6 digits.');

  const result = await query(
    `SELECT patient_id, first_name, last_name, email, phone, patient_pin_hash, status
     FROM patients
     WHERE (phone = $1 OR email = $1) AND status = 'active'
     LIMIT 1`,
    [identifier],
  );

  const patient = result.rows[0];

  if (!patient || !patient.patient_pin_hash) {
    throw ApiError.badRequest('Invalid credentials or PIN not set. Please contact reception to set your PIN.');
  }

  const valid = await bcrypt.compare(pin, patient.patient_pin_hash);
  if (!valid) throw ApiError.badRequest('Invalid credentials.');

  const token = jwt.sign(
    { patient_id: patient.patient_id, type: 'patient' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );

  return {
    token,
    expires_in: JWT_EXPIRY,
    patient: {
      patient_id: patient.patient_id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.email,
      phone: patient.phone,
    },
  };
}

function patientAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.badRequest('Authorization header with Bearer token is required.'));
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'patient') {
      return next(ApiError.badRequest('Token is not a patient portal token.'));
    }
    req.patientId = decoded.patient_id;
    return next();
  } catch {
    return next(ApiError.badRequest('Invalid or expired token. Please log in again.'));
  }
}

module.exports = { setPatientPin, loginPatient, patientAuthMiddleware };
