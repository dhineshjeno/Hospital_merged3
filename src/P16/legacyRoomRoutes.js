const express = require('express');
const legacyRoomController = require('./legacyRoomController');
const { requirePermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

router.get('/types', legacyRoomController.getRoomTypes);
router.get('/available', legacyRoomController.getAvailableRooms);
router.get('/occupied', legacyRoomController.getOccupiedRooms);
router.get('/occupancy-status', legacyRoomController.getRoomOccupancyStatus);
router.get('/emergency-wards', legacyRoomController.getEmergencyWards);
router.post('/check-in', requirePermission('admissions', 'create'), legacyRoomController.checkInRoom);
router.post('/check-out', requirePermission('admissions', 'update'), legacyRoomController.checkOutRoom);

module.exports = router;
