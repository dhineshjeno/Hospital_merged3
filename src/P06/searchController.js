const searchRepository = require('./searchRepository');
const patientRepository = require('../P01/patientRepository');
const { validateSearchQuery, validateCreateAllergy } = require('./searchValidator');
const { ApiError } = require('../utils/ApiError');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidId(id, label) {
  if (!UUID_REGEX.test(id)) throw ApiError.badRequest(`${label} must be a valid UUID.`);
}

function parsePagination(q, defaultSize = 20) {
  return {
    page: Math.max(1, parseInt(q.page, 10) || 1),
    pageSize: Math.min(100, Math.max(1, parseInt(q.pageSize, 10) || defaultSize)),
  };
}

async function assertPatientExists(patientId) {
  const patient = await patientRepository.findPatientById(patientId);
  if (!patient) throw ApiError.notFound('Patient not found.');
  return patient;
}

// ─── Global search ────────────────────────────────────────────────────────────

async function searchPatients(req, res, next) {
  try {
    validateSearchQuery(req.query);
    const { page, pageSize } = parsePagination(req.query);

    const { rows, totalCount } = await searchRepository.searchPatients(
      req.query.q,
      page,
      pageSize,
    );

    res.json({
      status: 'ok',
      data: rows,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Medical history summary ──────────────────────────────────────────────────

async function getMedicalHistory(req, res, next) {
  try {
    assertValidId(req.params.patientId, 'patient_id');

    const history = await searchRepository.getPatientMedicalHistory(req.params.patientId);
    if (!history) throw ApiError.notFound('Patient not found.');

    res.json({ status: 'ok', data: history });
  } catch (error) {
    next(error);
  }
}

// ─── Visit history ────────────────────────────────────────────────────────────

async function getVisitHistory(req, res, next) {
  try {
    assertValidId(req.params.patientId, 'patient_id');
    await assertPatientExists(req.params.patientId);

    const { page, pageSize } = parsePagination(req.query, 10);
    const { rows, totalCount } = await searchRepository.getVisitHistory(
      req.params.patientId, page, pageSize,
    );

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

// ─── Medication history ───────────────────────────────────────────────────────

async function getMedicationHistory(req, res, next) {
  try {
    assertValidId(req.params.patientId, 'patient_id');
    await assertPatientExists(req.params.patientId);

    const { page, pageSize } = parsePagination(req.query, 10);
    const { rows, totalCount } = await searchRepository.getMedicationHistory(
      req.params.patientId, page, pageSize,
    );

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

// ─── Allergies ────────────────────────────────────────────────────────────────

async function listAllergies(req, res, next) {
  try {
    assertValidId(req.params.patientId, 'patient_id');
    await assertPatientExists(req.params.patientId);

    const includeInactive = req.query.includeInactive === 'true';
    const allergies = await searchRepository.listAllergies(
      req.params.patientId, includeInactive,
    );

    res.json({ status: 'ok', data: allergies });
  } catch (error) {
    next(error);
  }
}

async function createAllergy(req, res, next) {
  try {
    assertValidId(req.params.patientId, 'patient_id');
    await assertPatientExists(req.params.patientId);
    validateCreateAllergy(req.body);

    const allergy = await searchRepository.createAllergy(req.params.patientId, req.body);
    res.status(201).json({ status: 'ok', data: allergy });
  } catch (error) {
    if (error.code === '23505') {
      return next(ApiError.conflict(
        'This patient already has a recorded allergy to this allergen.',
      ));
    }
    if (error.code === '23503') {
      return next(ApiError.badRequest(
        'noted_by_doctor_id does not reference an existing doctor.',
      ));
    }
    return next(error);
  }
}

async function deactivateAllergy(req, res, next) {
  try {
    assertValidId(req.params.patientId, 'patient_id');
    assertValidId(req.params.allergyId, 'patient_allergy_id');

    const allergy = await searchRepository.deactivateAllergy(
      req.params.allergyId, req.params.patientId,
    );
    if (!allergy) throw ApiError.notFound('Allergy not found for this patient.');

    res.json({ status: 'ok', message: 'Allergy marked as inactive.', data: allergy });
  } catch (error) {
    next(error);
  }
}

// ─── Emergency contact ────────────────────────────────────────────────────────

async function getEmergencyContact(req, res, next) {
  try {
    assertValidId(req.params.patientId, 'patient_id');

    const contact = await searchRepository.getEmergencyContact(req.params.patientId);
    if (!contact) throw ApiError.notFound('Patient not found.');

    res.json({ status: 'ok', data: contact });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchPatients,
  getMedicalHistory,
  getVisitHistory,
  getMedicationHistory,
  listAllergies,
  createAllergy,
  deactivateAllergy,
  getEmergencyContact,
};
