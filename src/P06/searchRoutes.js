const express = require('express');
const searchController = require('./searchController');

const router = express.Router();

// Global patient search
router.get('/search/patients', searchController.searchPatients);

// Medical history
router.get('/patients/:patientId/medical-history', searchController.getMedicalHistory);
router.get('/patients/:patientId/visits', searchController.getVisitHistory);
router.get('/patients/:patientId/medication-history', searchController.getMedicationHistory);
router.get('/patients/:patientId/emergency-contact', searchController.getEmergencyContact);

// Allergies
router.get('/patients/:patientId/allergies', searchController.listAllergies);
router.post('/patients/:patientId/allergies', searchController.createAllergy);
router.delete('/patients/:patientId/allergies/:allergyId', searchController.deactivateAllergy);

module.exports = router;
