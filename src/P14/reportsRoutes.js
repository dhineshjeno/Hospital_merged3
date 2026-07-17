const express = require('express');
const reportsController = require('./reportsController');

const router = express.Router();

router.get('/reports/patients', reportsController.patientDemographics);
router.get('/reports/appointments', reportsController.appointmentAnalytics);
router.get('/reports/doctors', reportsController.doctorUtilisation);
router.get('/reports/medicines', reportsController.medicineUsage);
router.get('/reports/revenue', reportsController.revenueReport);
router.get('/reports/lab', reportsController.labReport);
router.get('/reports/queue', reportsController.queueAnalytics);
router.get('/reports/bed-occupancy', reportsController.bedOccupancy);

module.exports = router;
