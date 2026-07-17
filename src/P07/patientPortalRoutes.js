const express = require('express');
const portalController = require('./patientPortalController');
const { patientAuthMiddleware } = require('./patientAuth');

const router = express.Router();

// Public auth endpoints — no token required
router.post('/portal/auth/set-pin', portalController.setPin);
router.post('/portal/auth/login', portalController.login);

// Protected portal endpoints — patient JWT required
router.get('/portal/me', patientAuthMiddleware, portalController.getMyProfile);
router.put('/portal/me', patientAuthMiddleware, portalController.updateMyProfile);
router.get('/portal/me/appointments', patientAuthMiddleware, portalController.getMyAppointments);
router.get('/portal/me/ehr-timeline', patientAuthMiddleware, portalController.getMyEhrTimeline);
router.get('/portal/me/prescriptions', patientAuthMiddleware, portalController.getMyPrescriptions);
router.get('/portal/me/lab-results', patientAuthMiddleware, portalController.getMyLabResults);

module.exports = router;
