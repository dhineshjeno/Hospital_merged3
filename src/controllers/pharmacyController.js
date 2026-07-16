const pharmacyRepository = require('../repositories/pharmacyRepository');
const patientRepository = require('../repositories/patientRepository');
const {
  validateCreateMedicine, validateUpdateMedicine, validateReceiveBatch,
  validateDispense, validateStockIn, validateAdjustment,
} = require('../validators/pharmacyValidator');
const { ApiError } = require('../utils/ApiError');
const { catchAsync } = require('../middleware/errorHandler');

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

const createMedicine = catchAsync(async (req, res, next) => {
  validateCreateMedicine(req.body);
  try {
    const medicine = await pharmacyRepository.createMedicine(req.hospitalId, req.body);
    res.status(201).json({ status: 'ok', data: medicine });
  } catch (error) {
    if (error.code === '23505') throw ApiError.conflict('A medicine with this medicine_code already exists.');
    throw error;
  }
});

const listMedicines = catchAsync(async (req, res, next) => {
  const { page, pageSize } = parsePagination(req.query);
  let requiresPrescription;
  if (req.query.requiresPrescription === 'true') requiresPrescription = true;
  if (req.query.requiresPrescription === 'false') requiresPrescription = false;

  const { rows, totalCount } = await pharmacyRepository.listMedicines(req.hospitalId, {
    search: req.query.search || null,
    category: req.query.category || null,
    status: req.query.status || null,
    requiresPrescription,
    page, pageSize,
  });
  res.json({
    status: 'ok', data: rows,
    pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) || 1 },
  });
});

const getMedicineById = catchAsync(async (req, res, next) => {
  assertValidId(req.params.id, 'medicine_id');
  const medicine = await pharmacyRepository.findMedicineById(req.hospitalId, req.params.id);
  if (!medicine) throw ApiError.notFound('Medicine not found.');
  res.json({ status: 'ok', data: medicine });
});

const updateMedicine = catchAsync(async (req, res, next) => {
  assertValidId(req.params.id, 'medicine_id');
  validateUpdateMedicine(req.body);
  const existing = await pharmacyRepository.findMedicineById(req.hospitalId, req.params.id);
  if (!existing) throw ApiError.notFound('Medicine not found.');
  const medicine = await pharmacyRepository.updateMedicine(req.hospitalId, req.params.id, req.body);
  res.json({ status: 'ok', data: medicine });
});

const getStockSummary = catchAsync(async (req, res, next) => {
  assertValidId(req.params.id, 'medicine_id');
  const summary = await pharmacyRepository.getStockSummary(req.hospitalId, req.params.id);
  if (!summary) throw ApiError.notFound('Medicine not found.');
  res.json({ status: 'ok', data: summary });
});

const receiveBatch = catchAsync(async (req, res, next) => {
  assertValidId(req.params.id, 'medicine_id');
  validateReceiveBatch(req.body);
  const medicine = await pharmacyRepository.findMedicineById(req.hospitalId, req.params.id);
  if (!medicine) throw ApiError.notFound('Medicine not found.');
  if (medicine.status === 'discontinued') {
    throw ApiError.conflict('Cannot receive stock for a discontinued medicine.');
  }
  try {
    const batch = await pharmacyRepository.receiveBatch(req.hospitalId, req.params.id, req.body);
    res.status(201).json({ status: 'ok', data: batch });
  } catch (error) {
    if (error.code === '23505') throw ApiError.conflict('A batch with this batch_number already exists for this medicine.');
    if (error.code === '23514') throw ApiError.badRequest('Batch data violates a constraint (check expiry/dates/prices).');
    throw error;
  }
});

const listBatches = catchAsync(async (req, res, next) => {
  assertValidId(req.params.id, 'medicine_id');
  const medicine = await pharmacyRepository.findMedicineById(req.hospitalId, req.params.id);
  if (!medicine) throw ApiError.notFound('Medicine not found.');
  const includeAll = req.query.includeAll === 'true';
  const batches = await pharmacyRepository.listBatches(req.hospitalId, req.params.id, includeAll);
  res.json({ status: 'ok', data: batches });
});

const updateBatchStatus = catchAsync(async (req, res, next) => {
  assertValidId(req.params.id, 'medicine_id');
  assertValidId(req.params.batchId, 'medicine_batch_id');
  const { status } = req.body;
  if (!['expired', 'recalled'].includes(status)) {
    throw ApiError.badRequest("status must be 'expired' or 'recalled'.");
  }
  const batch = await pharmacyRepository.updateBatchStatus(req.hospitalId, req.params.batchId, status);
  if (!batch) throw ApiError.notFound('Batch not found.');
  res.json({ status: 'ok', data: batch });
});

const dispenseMedicine = catchAsync(async (req, res, next) => {
  validateDispense(req.body);
  const patient = await patientRepository.findPatientById(req.body.patient_id);
  if (!patient || patient.hospital_id !== req.hospitalId) throw ApiError.notFound('Patient not found.');

  try {
    const result = await pharmacyRepository.dispense(req.hospitalId, req.body);
    res.status(201).json({ status: 'ok', data: result });
  } catch (error) {
    if (error.code === 'BATCH_NOT_FOUND') throw ApiError.notFound('Medicine batch not found.');
    if (error.code === 'BATCH_INACTIVE') throw ApiError.conflict(error.message);
    if (error.code === 'INSUFFICIENT_STOCK') throw ApiError.conflict(error.message);
    throw error;
  }
});

const stockInMedicine = catchAsync(async (req, res, next) => {
  validateStockIn(req.body);
  const batch = await pharmacyRepository.findBatchByIdOnly(req.hospitalId, req.body.medicine_batch_id);
  if (!batch) throw ApiError.notFound('Medicine batch not found.');
  try {
    const result = await pharmacyRepository.stockIn(req.hospitalId, req.body);
    res.status(201).json({ status: 'ok', data: result });
  } catch (error) {
    if (error.code === 'BATCH_NOT_FOUND') throw ApiError.notFound('Medicine batch not found.');
    if (error.code === '23514') throw ApiError.badRequest('Stock would exceed batch capacity.');
    throw error;
  }
});

const adjustStock = catchAsync(async (req, res, next) => {
  validateAdjustment(req.body);
  const batch = await pharmacyRepository.findBatchByIdOnly(req.hospitalId, req.body.medicine_batch_id);
  if (!batch) throw ApiError.notFound('Medicine batch not found.');
  try {
    const result = await pharmacyRepository.adjustment(req.hospitalId, req.body);
    res.status(201).json({ status: 'ok', data: result });
  } catch (error) {
    if (error.code === 'BATCH_NOT_FOUND') throw ApiError.notFound('Medicine batch not found.');
    if (error.code === 'NEGATIVE_STOCK') throw ApiError.conflict(error.message);
    throw error;
  }
});

const listTransactions = catchAsync(async (req, res, next) => {
  const { page, pageSize } = parsePagination(req.query, 20);
  const { rows, totalCount } = await pharmacyRepository.listTransactions(req.hospitalId, {
    medicineId: req.query.medicineId || null,
    batchId: req.query.batchId || null,
    transactionType: req.query.transactionType || null,
    page, pageSize,
  });
  res.json({
    status: 'ok', data: rows,
    pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) || 1 },
  });
});

const getAlerts = catchAsync(async (req, res, next) => {
  const withinDays = Math.min(90, Math.max(1, parseInt(req.query.expiryDays, 10) || 30));
  const [lowStock, expiring] = await Promise.all([
    pharmacyRepository.getLowStockAlerts(req.hospitalId),
    pharmacyRepository.getExpiryAlerts(req.hospitalId, withinDays),
  ]);
  res.json({
    status: 'ok',
    data: {
      low_stock_count: lowStock.length,
      expiring_count: expiring.length,
      low_stock: lowStock,
      expiring_within_days: withinDays,
      expiring: expiring,
    },
  });
});

module.exports = {
  createMedicine, listMedicines, getMedicineById, updateMedicine, getStockSummary,
  receiveBatch, listBatches, updateBatchStatus,
  dispenseMedicine, stockInMedicine, adjustStock, listTransactions,
  getAlerts,
};
