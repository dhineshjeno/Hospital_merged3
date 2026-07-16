import api from './api';
import type { LabResult } from '../types/lab';

interface P2LabOrder {
  lab_order_id: string;
  patient_id: string;
  doctor_id: string;
  consultation_id?: string;
  urgency: string;
  status: string;
  clinical_notes?: string;
  created_at: string;
  results?: P2LabResult[];
}

interface P2LabResult {
  lab_result_id: string;
  test_code: string;
  test_name: string;
  result_value: string;
  unit?: string;
  reference_range?: string;
  abnormality_flag?: boolean;
  notes?: string;
}

interface P2ListResponse {
  success: boolean;
  data: P2LabOrder[];
}

function adaptLabOrder(order: P2LabOrder, index: number): LabResult {
  const firstResult = order.results?.[0];
  return {
    id: index + 1,
    patientId: order.patient_id as unknown as number,
    patientName: '',
    doctorName: '',
    testName: firstResult?.test_name ?? order.clinical_notes ?? 'Lab test',
    date: order.created_at?.split('T')[0] ?? '',
    status: order.status === 'Completed' ? 'completed' : 'pending',
    value: firstResult?.result_value ?? '',
    unit: firstResult?.unit ?? '',
    referenceRange: firstResult?.reference_range ?? '',
    isAbnormal: firstResult?.abnormality_flag ?? false,
    hospitalId: 1,
  };
}

export async function getLabResults(patientId?: string | number): Promise<LabResult[]> {
  const params: Record<string, string> = {};
  if (patientId) params.patient_id = String(patientId);
  const response = await api.get<P2ListResponse>('/lab/orders', { params });
  return response.data.data.map(adaptLabOrder);
}

export async function getLabResultById(id: string): Promise<LabResult> {
  const response = await api.get<{ success: boolean; data: P2LabOrder }>(`/lab/orders/${id}`);
  return adaptLabOrder(response.data.data, 0);
}

export async function createLabOrder(data: {
  patientId: string; doctorId: string;
  testCodes: string[]; consultationId?: string;
  urgency?: string; clinicalNotes?: string;
}): Promise<void> {
  await api.post('/lab/orders', {
    patient_id: data.patientId,
    doctor_id: data.doctorId,
    test_codes: data.testCodes,
    consultation_id: data.consultationId,
    urgency: data.urgency || 'Routine',
    clinical_notes: data.clinicalNotes,
  });
}