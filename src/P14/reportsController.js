const reportsRepository = require('./reportsRepository');
const { ApiError } = require('../utils/ApiError');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDateRange(query) {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 8) + '01';

  const dateFrom = DATE_REGEX.test(query.dateFrom) ? query.dateFrom : firstOfMonth;
  const dateTo = DATE_REGEX.test(query.dateTo) ? query.dateTo : today;

  if (dateFrom > dateTo) {
    throw ApiError.badRequest('dateFrom cannot be after dateTo.');
  }

  return { dateFrom, dateTo };
}

async function patientDemographics(req, res, next) {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const data = await reportsRepository.getPatientDemographics(dateFrom, dateTo);
    res.json({ status: 'ok', data: { date_from: dateFrom, date_to: dateTo, ...data } });
  } catch (error) { next(error); }
}

async function appointmentAnalytics(req, res, next) {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const data = await reportsRepository.getAppointmentAnalytics(dateFrom, dateTo);
    res.json({ status: 'ok', data: { date_from: dateFrom, date_to: dateTo, ...data } });
  } catch (error) { next(error); }
}

async function doctorUtilisation(req, res, next) {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const data = await reportsRepository.getDoctorUtilisation(dateFrom, dateTo);
    res.json({ status: 'ok', data: { date_from: dateFrom, date_to: dateTo, doctors: data } });
  } catch (error) { next(error); }
}

async function medicineUsage(req, res, next) {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const data = await reportsRepository.getMedicineUsage(dateFrom, dateTo, limit);
    res.json({ status: 'ok', data: { date_from: dateFrom, date_to: dateTo, ...data } });
  } catch (error) { next(error); }
}

async function revenueReport(req, res, next) {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const data = await reportsRepository.getRevenueReport(dateFrom, dateTo);
    res.json({ status: 'ok', data: { date_from: dateFrom, date_to: dateTo, ...data } });
  } catch (error) { next(error); }
}

async function labReport(req, res, next) {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const data = await reportsRepository.getLabReport(dateFrom, dateTo);
    res.json({ status: 'ok', data: { date_from: dateFrom, date_to: dateTo, ...data } });
  } catch (error) { next(error); }
}

async function queueAnalytics(req, res, next) {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const data = await reportsRepository.getQueueAnalytics(dateFrom, dateTo);
    res.json({ status: 'ok', data: { date_from: dateFrom, date_to: dateTo, ...data } });
  } catch (error) { next(error); }
}

async function bedOccupancy(req, res, next) {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const data = await reportsRepository.getBedOccupancyTrends(dateFrom, dateTo);
    res.json({ status: 'ok', data: { date_from: dateFrom, date_to: dateTo, ...data } });
  } catch (error) { next(error); }
}

module.exports = {
  patientDemographics,
  appointmentAnalytics,
  doctorUtilisation,
  medicineUsage,
  revenueReport,
  labReport,
  queueAnalytics,
  bedOccupancy,
};
