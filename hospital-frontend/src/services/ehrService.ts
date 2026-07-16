import api from './api';

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  chiefComplaint: string;
  assessment?: string;
  plan?: string;
  notes?: string;
  createdAt: string;
}

export interface VitalRecord {
  id: string;
  patientId: string;
  consultationId?: string;
  temperatureCelsius?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRateBpm?: number;
  oxygenSaturationPercent?: number;
  weightKg?: number;
  heightCm?: number;
  recordedAt: string;
}

interface P2Consultation {
  consultation_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string;
  chief_complaint: string;
  assessment?: string;
  plan?: string;
  notes?: string;
  created_at: string;
}

interface P2Vital {
  vital_id: string;
  patient_id: string;
  consultation_id?: string;
  temperature_celsius?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate_bpm?: number;
  oxygen_saturation_percent?: number;
  weight_kg?: number;
  height_cm?: number;
  recorded_at: string;
}

function adaptConsultation(c: P2Consultation): Consultation {
  return {
    id: c.consultation_id,
    patientId: c.patient_id,
    doctorId: c.doctor_id,
    appointmentId: c.appointment_id,
    chiefComplaint: c.chief_complaint,
    assessment: c.assessment,
    plan: c.plan,
    notes: c.notes,
    createdAt: c.created_at?.split('T')[0] ?? '',
  };
}

function adaptVital(v: P2Vital): VitalRecord {
  const bp = v.blood_pressure_systolic && v.blood_pressure_diastolic
    ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
    : '';
  return {
    id: v.vital_id,
    patientId: v.patient_id,
    consultationId: v.consultation_id,
    temperatureCelsius: v.temperature_celsius,
    bloodPressureSystolic: v.blood_pressure_systolic,
    bloodPressureDiastolic: v.blood_pressure_diastolic,
    heartRateBpm: v.heart_rate_bpm,
    oxygenSaturationPercent: v.oxygen_saturation_percent,
    weightKg: v.weight_kg,
    heightCm: v.height_cm,
    recordedAt: v.recorded_at,
  };
}

export async function createConsultation(data: {
  patientId: string; doctorId: string;
  appointmentId: string; chiefComplaint: string;
  assessment?: string; plan?: string; notes?: string;
}): Promise<Consultation> {
  const response = await api.post<{ success: boolean; data: P2Consultation }>('/ehr/consultations', {
    patient_id: data.patientId,
    doctor_id: data.doctorId,
    appointment_id: data.appointmentId,
    chief_complaint: data.chiefComplaint,
    assessment: data.assessment,
    plan: data.plan,
    notes: data.notes,
  });
  return adaptConsultation(response.data.data);
}

export async function getConsultations(patientId: string): Promise<Consultation[]> {
  const response = await api.get<{ success: boolean; data: P2Consultation[] }>(
    '/ehr/consultations', { params: { patient_id: patientId } }
  );
  return response.data.data.map(adaptConsultation);
}

export async function recordVitals(data: {
  patientId: string; consultationId?: string;
  temperatureCelsius?: number;
  bloodPressureSystolic?: number; bloodPressureDiastolic?: number;
  heartRateBpm?: number; oxygenSaturationPercent?: number;
  weightKg?: number; heightCm?: number;
}): Promise<VitalRecord> {
  const payload: Record<string, unknown> = {
    patient_id: data.patientId,
    consultation_id: data.consultationId,
    temperature_celsius: data.temperatureCelsius,
    blood_pressure_systolic: data.bloodPressureSystolic,
    blood_pressure_diastolic: data.bloodPressureDiastolic,
    heart_rate_bpm: data.heartRateBpm,
    oxygen_saturation_percent: data.oxygenSaturationPercent,
    weight_kg: data.weightKg,
    height_cm: data.heightCm,
  };
  // Remove undefined values
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  const response = await api.post<{ success: boolean; data: P2Vital }>('/ehr/vitals', payload);
  return adaptVital(response.data.data);
}

export async function getVitals(patientId: string): Promise<VitalRecord[]> {
  const response = await api.get<{ success: boolean; data: P2Vital[] }>(
    '/ehr/vitals', { params: { patient_id: patientId } }
  );
  return response.data.data.map(adaptVital);
}