const express = require('express');
const pharmacyController = require('./pharmacyController');
const { requirePermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

router.post('/medicines', requirePermission('medicines', 'create'), pharmacyController.createMedicine);
router.get('/medicines', requirePermission('medicines', 'read'), pharmacyController.listMedicines);
router.get('/medicines/:id', requirePermission('medicines', 'read'), pharmacyController.getMedicineById);
router.put('/medicines/:id', requirePermission('medicines', 'update'), pharmacyController.updateMedicine);
router.get('/medicines/:id/stock-summary', requirePermission('medicine_inventory', 'read'), pharmacyController.getStockSummary);
router.post('/medicines/:id/batches', requirePermission('medicine_inventory', 'create'), pharmacyController.receiveBatch);
router.get('/medicines/:id/batches', requirePermission('medicine_inventory', 'read'), pharmacyController.listBatches);
router.patch('/medicines/:id/batches/:batchId/status', requirePermission('medicine_inventory', 'update'), pharmacyController.updateBatchStatus);
router.post('/pharmacy/dispense', requirePermission('medicine_inventory', 'update'), pharmacyController.dispenseMedicine);
router.post('/pharmacy/stock-in', requirePermission('medicine_inventory', 'update'), pharmacyController.stockInMedicine);
router.post('/pharmacy/adjust', requirePermission('medicine_inventory', 'update'), pharmacyController.adjustStock);
router.get('/pharmacy/transactions', requirePermission('medicine_inventory', 'read'), pharmacyController.listTransactions);
router.get('/pharmacy/alerts', requirePermission('medicine_inventory', 'read'), pharmacyController.getAlerts);

module.exports = router;
