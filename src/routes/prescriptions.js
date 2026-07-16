const express = require('express');
const prescriptionService = require('../services/prescriptionService');

const router = express.Router();

// GET /api/v1/prescriptions
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const prescriptions = await prescriptionService.getAllPrescriptions(
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      data: prescriptions,
      count: prescriptions.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/prescriptions/patient/:patientId
router.get('/patient/:patientId', async (req, res) => {
  try {
    const prescriptions = await prescriptionService.getPrescriptionsByPatient(
      req.params.patientId
    );

    res.json({
      success: true,
      data: prescriptions,
      count: prescriptions.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/prescriptions/doctor/:doctorId
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const prescriptions = await prescriptionService.getPrescriptionsByDoctor(
      req.params.doctorId
    );

    res.json({
      success: true,
      data: prescriptions,
      count: prescriptions.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/prescriptions/:id
router.get('/:id', async (req, res) => {
  try {
    const prescription = await prescriptionService.getPrescriptionById(
      req.params.id
    );

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const items = await prescriptionService.getPrescriptionItems(req.params.id);

    res.json({
      success: true,
      data: {
        ...prescription,
        items
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/prescriptions/:id/items
router.get('/:id/items', async (req, res) => {
  try {
    const items = await prescriptionService.getPrescriptionItems(
      req.params.id
    );

    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/prescriptions
router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      appointmentId,
      expiryDate,
      notes,
      items
    } = req.body;

    if (!patientId || !doctorId || !expiryDate) {
      return res.status(400).json({
        error: 'Patient ID, Doctor ID, and expiry date required'
      });
    }

    const prescription = await prescriptionService.createPrescription({
      patientId,
      doctorId,
      appointmentId,
      expiryDate,
      notes,
      items
    });

    res.status(201).json({
      success: true,
      message: 'Prescription created',
      data: prescription
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/prescriptions/:id
router.put('/:id', async (req, res) => {
  try {
    const prescription = await prescriptionService.updatePrescription(
      req.params.id,
      req.body
    );

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json({
      success: true,
      message: 'Prescription updated',
      data: prescription
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/prescriptions/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await prescriptionService.deletePrescription(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json({
      success: true,
      message: 'Prescription deleted'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;