const express = require('express');
const queueController = require('./queueController');
const { requirePermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

router.post('/', requirePermission('queue', 'create'), queueController.createQueueEntry);
router.get('/doctors/:doctorId', requirePermission('queue', 'read'), queueController.listQueueForDoctor);
router.get('/doctors/:doctorId/stats', requirePermission('queue', 'read'), queueController.getQueueStats);
router.get('/:id', requirePermission('queue', 'read'), queueController.getQueueEntryById);
router.patch('/:id/status', requirePermission('queue', 'update'), queueController.updateQueueStatus);

module.exports = router;
