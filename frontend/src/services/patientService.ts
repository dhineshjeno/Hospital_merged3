import api from './api';
import type { Patient, CreatePatientRequest } from '../types/patient';

interface P2Patient {
  patient_id: string;
  medical_record_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email?: string;
  blood_group?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  is_active: boolean;
  created_at: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
}

interface P2ListResponse {
  success: boolean;
  data: P2Patient[];
  pagination: { page: number; limit: number; total: number; pages: number; };
}

interface P2SingleResponse {
  success: boolean;
  data: P2Patient;
}

function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function dobFromAge(age: number): string {
  return `${new Date().getFullYear() - age}-01-01`;
}

function adaptPatient(p: P2Patient): Patient {
  return {
    id: p.patient_id,
    medicalRecordNumber: p.medical_record_number,
    name: `${p.first_name} ${p.last_name}`.trim(),
    age: ageFromDob(p.date_of_birth),
    dateOfBirth: p.date_of_birth,
    gender: (p.gender as Patient['gender']) || 'Other',
    phone: p.phone,
    email: p.email,
    bloodGroup: p.blood_group || '',
    address: [p.address, p.city, p.state].filter(Boolean).join(', '),
    city: p.city,
    state: p.state,
    postalCode: p.postal_code,
    status: p.is_active ? 'outpatient' : 'discharged',
    isActive: p.is_active,
    registeredAt: p.created_at?.split('T')[0],
    emergencyContactName: p.emergency_contact_name,
    emergencyContactPhone: p.emergency_contact_phone,
    emergencyContactRelation: p.emergency_contact_relation,
  };
}

export async function getPatients(search?: string): Promise<Patient[]> {
  const params: Record<string, string> = { limit: '100' };
  if (search) params.search = search;
  const response = await api.get<P2ListResponse>('/patients', { params });
  return response.data.data.map(adaptPatient);
}

export async function getPatientById(id: string): Promise<Patient> {
  const response = await api.get<P2SingleResponse>(`/patients/${id}`);
  return adaptPatient(response.data.data);
}

export async function createPatient(data: CreatePatientRequest): Promise<Patient> {
  const [firstName, ...rest] = data.name.split(' ');
  const payload = {
    medical_record_number: `MRN-${Date.now()}`,
    first_name: firstName,
    last_name: rest.join(' ') || firstName,
    date_of_birth: dobFromAge(data.age),
    gender: data.gender,
    phone: data.phone,
    blood_group: data.bloodGroup,
    address: data.address,
    emergency_contact_name: data.emergencyContactName,
    emergency_contact_phone: data.emergencyContactPhone,
    emergency_contact_relation: data.emergencyContactRelation,
  };
  const response = await api.post<P2SingleResponse>('/patients', payload);
  return adaptPatient(response.data.data);
}

export async function updatePatient(id: string, data: Partial<CreatePatientRequest>): Promise<Patient> {
  const payload: Record<string, unknown> = {};
  if (data.name) {
    const [firstName, ...rest] = data.name.split(' ');
    payload.first_name = firstName;
    payload.last_name = rest.join(' ') || firstName;
  }
  if (data.phone) payload.phone = data.phone;
  if (data.address) payload.address = data.address;
  if (data.bloodGroup) payload.blood_group = data.bloodGroup;
  if (data.emergencyContactName !== undefined) payload.emergency_contact_name = data.emergencyContactName;
  if (data.emergencyContactPhone !== undefined) payload.emergency_contact_phone = data.emergencyContactPhone;
  if (data.emergencyContactRelation !== undefined) payload.emergency_contact_relation = data.emergencyContactRelation;

  const response = await api.put<P2SingleResponse>(`/patients/${id}`, payload);
  return adaptPatient(response.data.data);
}

export async function deletePatient(id: string): Promise<void> {
  await api.delete(`/patients/${id}`);
}

export async function setPatientActive(id: string, isActive: boolean): Promise<Patient> {
  const response = await api.put<P2SingleResponse>(`/patients/${id}`, { is_active: isActive });
  return adaptPatient(response.data.data);
}