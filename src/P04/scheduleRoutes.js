const express = require('express');
const scheduleController = require('./scheduleController');

const router = express.Router();

router.post('/doctors/:doctorId/schedules', scheduleController.createSchedule);
router.get('/doctors/:doctorId/schedules', scheduleController.listSchedules);
router.put('/doctors/:doctorId/schedules/:id', scheduleController.updateSchedule);
router.delete('/doctors/:doctorId/schedules/:id', scheduleController.deactivateSchedule);
router.get('/doctors/:doctorId/available-slots', scheduleController.getAvailableSlots);

module.exports = router;
