const express = require('express');
const dictionaryController = require('./dictionaryController');
const { requirePermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

router.get('/', requirePermission('medicines_dictionary', 'read'), dictionaryController.getDictionary);
router.post('/request', requirePermission('medicines_dictionary', 'create'), dictionaryController.requestNewMedicine);
router.put('/:id/approve', requirePermission('medicines_dictionary', 'update'), dictionaryController.approveMedicine);
router.put('/:id/reject', requirePermission('medicines_dictionary', 'update'), dictionaryController.rejectMedicine);

module.exports = router;
