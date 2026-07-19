const express = require('express');
const reportsController = require('./reportsController');
const { requirePermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

router.get('/reports/patients', requirePermission('hospital', 'read'), reportsController.patientDemographics);
router.get('/reports/appointments', requirePermission('hospital', 'read'), reportsController.appointmentAnalytics);
router.get('/reports/doctors', requirePermission('hospital', 'read'), reportsController.doctorUtilisation);
router.get('/reports/medicines', requirePermission('hospital', 'read'), reportsController.medicineUsage);
router.get('/reports/revenue', requirePermission('hospital', 'read'), reportsController.revenueReport);
router.get('/reports/lab', requirePermission('hospital', 'read'), reportsController.labReport);
router.get('/reports/queue', requirePermission('hospital', 'read'), reportsController.queueAnalytics);
router.get('/reports/bed-occupancy', requirePermission('hospital', 'read'), reportsController.bedOccupancy);

module.exports = router;
