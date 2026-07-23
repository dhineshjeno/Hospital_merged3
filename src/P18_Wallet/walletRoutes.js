const express = require('express');
const walletController = require('./walletController');
const { requirePermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

// GET balance for a patient
router.get('/:patientId', requirePermission('patient_wallet', 'read'), walletController.getBalance);
// Credit (add funds)
router.post('/:patientId/credit', requirePermission('patient_wallet', 'create'), walletController.credit);
// Debit (use funds)
router.post('/:patientId/debit', requirePermission('patient_wallet', 'update'), walletController.debit);
// Transaction history
router.get('/:patientId/history', requirePermission('patient_wallet', 'read'), walletController.getHistory);

module.exports = router;
