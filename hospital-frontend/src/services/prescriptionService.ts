import api from './api';
import type { Prescription } from '../types/prescription';

interface P2Prescription {
  prescription_id: string;
  patient_id: string;
  doctor_id: string;
  consultation_id: string;
  instructions: string;
  status: string;
  valid_until?: string;
  created_at: string;
  items?: {
    prescription_item_id: string;
    medicine_name: string;
    dosage: string;
    unit: string;
    frequency: string;
    duration_days: number;
    quantity: number;
    instructions?: string;
  }[];
}

function adaptPrescription(p: P2Prescription): Prescription {
  return {
    id: p.prescription_id,
    patientId: p.patient_id,
    doctorId: p.doctor_id,
    doctorName: '',
    prescribedAt: p.created_at?.split('T')[0] ?? '',
    status: p.status === 'Active' ? 'active' : 'completed',
    items: (p.items ?? []).map((it) => ({
      id: it.prescription_item_id,
      medicationName: it.medicine_name,
      dosage: `${it.dosage} ${it.unit}`,
      frequency: it.frequency,
      duration: `${it.duration_days} days`,
      instructions: it.instructions,
    })),
  };
}

export async function getPatientPrescriptions(patientId: string): Promise<Prescription[]> {
  const response = await api.get<{ success: boolean; data: P2Prescription[] }>(
    '/prescriptions', { params: { patient_id: patientId } }
  );
  return response.data.data.map(adaptPrescription);
}

export async function createPrescription(data: {
  patientId: string; doctorId: string; consultationId: string; instructions: string;
}): Promise<Prescription> {
  const response = await api.post<{ success: boolean; data: P2Prescription }>('/prescriptions', {
    patient_id: data.patientId,
    doctor_id: data.doctorId,
    consultation_id: data.consultationId,
    instructions: data.instructions,
  });
  return adaptPrescription(response.data.data);
}

export async function addPrescriptionItem(prescriptionId: string, item: {
  medicineName: string; dosage: string; unit: string;
  frequency: string; durationDays: number; quantity: number;
  instructions?: string;
}): Promise<void> {
  await api.post(`/prescriptions/${prescriptionId}/items`, {
    medicine_name: item.medicineName,
    dosage: item.dosage,
    unit: item.unit,
    frequency: item.frequency,
    duration_days: item.durationDays,
    quantity: item.quantity,
    instructions: item.instructions,
  });
}