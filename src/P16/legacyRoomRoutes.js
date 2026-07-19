const express = require('express');
const legacyRoomController = require('./legacyRoomController');
const { requirePermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

router.get('/types', requirePermission('wards', 'read'), legacyRoomController.getRoomTypes);
router.get('/available', requirePermission('wards', 'read'), legacyRoomController.getAvailableRooms);
router.get('/occupied', requirePermission('wards', 'read'), legacyRoomController.getOccupiedRooms);
router.get('/occupancy-status', requirePermission('wards', 'read'), legacyRoomController.getRoomOccupancyStatus);
router.get('/emergency-wards', requirePermission('wards', 'read'), legacyRoomController.getEmergencyWards);
router.post('/check-in', requirePermission('admissions', 'create'), legacyRoomController.checkInRoom);
router.post('/check-out', requirePermission('admissions', 'update'), legacyRoomController.checkOutRoom);

module.exports = router;
