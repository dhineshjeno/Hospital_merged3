const { randomUUID: uuidv4 } = require('crypto');

// MOCK PRESCRIPTIONS DATABASE
const mockPrescriptions = [
  {
    id: '00000000-0000-0000-0000-000000000501',
    patientId: '00000000-0000-0000-0000-000000000101',
    doctorId: '00000000-0000-0000-0000-000000000201',
    appointmentId: '00000000-0000-0000-0000-000000000301',
    prescriptionDate: '2026-06-20',
    expiryDate: '2026-07-20',
    status: 'active', // active, expired, cancelled
    notes: 'Take medicine after food',
    createdAt: new Date()
  }
];

const mockPrescriptionItems = [
  {
    id: '00000000-0000-0000-0000-000000000601',
    prescriptionId: '00000000-0000-0000-0000-000000000501',
    medicineId: '00000000-0000-0000-0000-000000000701',
    medicineName: 'Aspirin',
    dosage: '500mg',
    frequency: 'Twice daily',
    duration: '7 days',
    instructions: 'After meals',
    quantity: 14
  }
];

class PrescriptionService {
  static async getAllPrescriptions(limit = 20, offset = 0) {
    return mockPrescriptions.slice(offset, offset + limit);
  }

  static async getPrescriptionById(id) {
    return mockPrescriptions.find(p => p.id === id) || null;
  }

  static async getPrescriptionsByPatient(patientId) {
    return mockPrescriptions.filter(p => p.patientId === patientId);
  }

  static async getPrescriptionsByDoctor(doctorId) {
    return mockPrescriptions.filter(p => p.doctorId === doctorId);
  }

  static async getPrescriptionItems(prescriptionId) {
    return mockPrescriptionItems.filter(
      item => item.prescriptionId === prescriptionId
    );
  }

  static async createPrescription({
    patientId,
    doctorId,
    appointmentId,
    expiryDate,
    notes,
    items
  }) {
    const newPrescription = {
      id: uuidv4(),
      patientId,
      doctorId,
      appointmentId,
      prescriptionDate: new Date().toISOString().split('T')[0],
      expiryDate,
      status: 'active',
      notes,
      createdAt: new Date()
    };

    mockPrescriptions.push(newPrescription);

    // Add prescription items
    if (items && items.length > 0) {
      items.forEach(item => {
        const newItem = {
          id: uuidv4(),
          prescriptionId: newPrescription.id,
          ...item
        };
        mockPrescriptionItems.push(newItem);
      });
    }

    return {
      ...newPrescription,
      items: items || []
    };
  }

  static async updatePrescription(id, updateData) {
    const prescription = mockPrescriptions.find(p => p.id === id);
    if (!prescription) return null;

    Object.assign(prescription, updateData, { updatedAt: new Date() });
    return prescription;
  }

  static async cancelPrescription(id) {
    const prescription = mockPrescriptions.find(p => p.id === id);
    if (!prescription) return null;

    prescription.status = 'cancelled';
    prescription.updatedAt = new Date();
    return prescription;
  }

  static async deletePrescription(id) {
    const index = mockPrescriptions.findIndex(p => p.id === id);
    if (index === -1) return false;

    // Also delete items
    const itemIndices = mockPrescriptionItems
      .map((item, i) => item.prescriptionId === id ? i : -1)
      .filter(i => i !== -1)
      .reverse();

    itemIndices.forEach(i => mockPrescriptionItems.splice(i, 1));
    mockPrescriptions.splice(index, 1);
    return true;
  }
}

module.exports = PrescriptionService;