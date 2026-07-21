const express = require('express');
const purchaseController = require('./purchaseController');
const { requirePermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

router.post('/', requirePermission('purchases', 'create'), purchaseController.createPurchase);
router.get('/approvals', requirePermission('purchases', 'approve'), purchaseController.getPendingApprovals);
router.put('/approvals/:id', requirePermission('purchases', 'approve'), purchaseController.reviewApproval);

module.exports = router;
