const express = require('express');
const queueController = require('./queueController');

const router = express.Router();

router.post('/', queueController.createQueueEntry);
router.get('/doctors/:doctorId', queueController.listQueueForDoctor);
router.get('/doctors/:doctorId/stats', queueController.getQueueStats);
router.get('/:id', queueController.getQueueEntryById);
router.patch('/:id/status', queueController.updateQueueStatus);

module.exports = router;
