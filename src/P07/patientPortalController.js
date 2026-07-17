const { setPatientPin, loginPatient } = require('./patientAuth');
const patientRepository = require('../P01/patientRepository');
const appointmentRepository = require('../P03/appointmentRepository');
const ehrRepository = require('../P08/ehrRepository');
const { query } = require('../config/database');
const { ApiError } = require('../utils/ApiError');

// ─── Auth endpoints (no middleware required) ──────────────────────────────────

async function setPin(req, res, next) {
  try {
    const { patient_id, pin } = req.body;
    if (!patient_id || !pin) {
      throw ApiError.badRequest('patient_id and pin are required.');
    }
    const patient = await setPatientPin(patient_id, pin);
    res.json({ status: 'ok', message: 'PIN set successfully.', data: patient });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { identifier, pin } = req.body;
    const result = await loginPatient(identifier, pin);
    res.json({ status: 'ok', data: result });
  } catch (error) {
    next(error);
  }
}

// ─── Portal endpoints (patientAuthMiddleware required — set by router) ────────

async function getMyProfile(req, res, next) {
  try {
    const patient = await patientRepository.findPatientById(req.patientId);
    if (!patient) throw ApiError.notFound('Patient not found.');
    res.json({ status: 'ok', data: patient });
  } catch (error) {
    next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const ALLOWED_FIELDS = [
      'phone', 'email', 'address_line1', 'address_line2',
      'city', 'state', 'postal_code',
      'emergency_contact_name', 'emergency_contact_phone',
    ];
    const updates = {};
    ALLOWED_FIELDS.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) updates[f] = req.body[f];
    });

    if (!Object.keys(updates).length) {
      throw ApiError.badRequest('No updatable fields provided.');
    }

    const patient = await patientRepository.updatePatient(req.patientId, updates);
    res.json({ status: 'ok', data: patient });
  } catch (error) {
    next(error);
  }
}

async function getMyAppointments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));

    const { rows, totalCount } = await appointmentRepository.listAppointments({
      patientId: req.patientId,
      status: req.query.status || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      page,
      pageSize,
    });

    res.json({
      status: 'ok',
      data: rows,
      pagination: {
        page, pageSize, totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getMyEhrTimeline(req, res, next) {
  try {
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const timeline = await ehrRepository.getEhrTimeline(req.patientId, {
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      limit,
    });

    res.json({
      status: 'ok',
      data: { patient_id: req.patientId, total_events: timeline.length, timeline },
    });
  } catch (error) {
    next(error);
  }
}

async function getMyPrescriptions(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;

    const result = await query(
      `SELECT p.*, d.first_name AS doctor_first_name, d.last_name AS doctor_last_name
       FROM prescriptions p
       JOIN doctors d ON d.doctor_id = p.doctor_id
       WHERE p.patient_id = $1
       ORDER BY p.prescribed_at DESC
       LIMIT $2 OFFSET $3`,
      [req.patientId, pageSize, offset],
    );

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM prescriptions WHERE patient_id = $1`,
      [req.patientId],
    );

    res.json({
      status: 'ok',
      data: result.rows,
      pagination: {
        page, pageSize,
        totalCount: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / pageSize) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getMyLabResults(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;

    const result = await query(
      `SELECT
         lo.lab_order_id, lo.lab_order_number, lo.ordered_at, lo.status AS order_status,
         loi.lab_order_item_id, loi.status AS item_status,
         ltc.test_name, ltc.loinc_code, ltc.specimen_type,
         lr.lab_result_id, lr.result_value, lr.result_unit,
         lr.reference_range, lr.abnormal_flag, lr.result_status,
         lr.performed_at, lr.verified_at
       FROM lab_orders lo
       JOIN lab_order_items loi ON loi.lab_order_id = lo.lab_order_id
       JOIN lab_test_catalog ltc ON ltc.lab_test_id = loi.lab_test_id
       LEFT JOIN lab_results lr ON lr.lab_order_item_id = loi.lab_order_item_id
       WHERE lo.patient_id = $1
       ORDER BY lo.ordered_at DESC
       LIMIT $2 OFFSET $3`,
      [req.patientId, pageSize, offset],
    );

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM lab_orders lo
       JOIN lab_order_items loi ON loi.lab_order_id = lo.lab_order_id
       WHERE lo.patient_id = $1`,
      [req.patientId],
    );

    res.json({
      status: 'ok',
      data: result.rows,
      pagination: {
        page, pageSize,
        totalCount: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / pageSize) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  setPin,
  login,
  getMyProfile,
  updateMyProfile,
  getMyAppointments,
  getMyEhrTimeline,
  getMyPrescriptions,
  getMyLabResults,
};
