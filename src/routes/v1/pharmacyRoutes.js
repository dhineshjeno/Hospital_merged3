const express = require('express');
const pharmacyController = require('../../controllers/pharmacyController');

const router = express.Router();

router.post('/medicines', pharmacyController.createMedicine);
router.get('/medicines', pharmacyController.listMedicines);
router.get('/medicines/:id', pharmacyController.getMedicineById);
router.put('/medicines/:id', pharmacyController.updateMedicine);
router.get('/medicines/:id/stock-summary', pharmacyController.getStockSummary);
router.post('/medicines/:id/batches', pharmacyController.receiveBatch);
router.get('/medicines/:id/batches', pharmacyController.listBatches);
router.patch('/medicines/:id/batches/:batchId/status', pharmacyController.updateBatchStatus);
router.post('/pharmacy/dispense', pharmacyController.dispenseMedicine);
router.post('/pharmacy/stock-in', pharmacyController.stockInMedicine);
router.post('/pharmacy/adjust', pharmacyController.adjustStock);
router.get('/pharmacy/transactions', pharmacyController.listTransactions);
router.get('/pharmacy/alerts', pharmacyController.getAlerts);

module.exports = router;
