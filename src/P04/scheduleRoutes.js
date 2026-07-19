const express = require('express');
const scheduleController = require('./scheduleController');
const { requirePermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

router.post('/doctors/:doctorId/schedules', requirePermission('doctors', 'update'), scheduleController.createSchedule);
router.get('/doctors/:doctorId/schedules', requirePermission('doctors', 'read'), scheduleController.listSchedules);
router.put('/doctors/:doctorId/schedules/:id', requirePermission('doctors', 'update'), scheduleController.updateSchedule);
router.delete('/doctors/:doctorId/schedules/:id', requirePermission('doctors', 'update'), scheduleController.deactivateSchedule);
router.get('/doctors/:doctorId/available-slots', requirePermission('appointments', 'create'), scheduleController.getAvailableSlots);

module.exports = router;
