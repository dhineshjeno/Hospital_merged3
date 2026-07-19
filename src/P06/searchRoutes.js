const express = require('express');
const searchController = require('./searchController');
const { requirePermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

// Global patient search
router.get('/patients', requirePermission('patients', 'read'), searchController.searchPatients);

// Medical history
router.get('/patients/:patientId/medical-history', requirePermission('patients', 'read'), searchController.getMedicalHistory);
router.get('/patients/:patientId/visits', requirePermission('patients', 'read'), searchController.getVisitHistory);
router.get('/patients/:patientId/medication-history', requirePermission('patients', 'read'), searchController.getMedicationHistory);
router.get('/patients/:patientId/emergency-contact', requirePermission('patients', 'read'), searchController.getEmergencyContact);

// Allergies
router.get('/patients/:patientId/allergies', requirePermission('patient_allergies', 'read'), searchController.listAllergies);
router.post('/patients/:patientId/allergies', requirePermission('patient_allergies', 'create'), searchController.createAllergy);
router.delete('/patients/:patientId/allergies/:allergyId', requirePermission('patient_allergies', 'delete'), searchController.deactivateAllergy);

module.exports = router;
