import api from './api';
import type { Doctor, CreateDoctorRequest } from '../types/doctor';

interface P2Doctor {
  doctor_id: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  specialization: string;
  phone?: string;
  email?: string;
  experience_years?: number;
  consultation_fee?: number;
  is_available: boolean;
  employee_code?: string;
  registration_number?: string;
}

interface P2ListResponse {
  success: boolean;
  data: P2Doctor[];
}

interface P2SingleResponse {
  success: boolean;
  data: P2Doctor;
}

function adaptDoctor(d: P2Doctor): Doctor {
  const name = (d.name
    ?? `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim())
    || 'Unknown doctor';
  return {
    id: d.doctor_id,
    name,
    specialty: d.specialization,
    phone: d.phone ?? '',
    email: d.email ?? '',
    experience: d.experience_years ?? 0,
    consultationFee: d.consultation_fee,
    status: d.is_available ? 'available' : 'on-leave',
    isAvailable: d.is_available,
  };
}

export async function getDoctors(search?: string): Promise<Doctor[]> {
  const params: Record<string, string> = { limit: '100' };
  if (search) params.search = search;
  const response = await api.get<P2ListResponse>('/doctors', { params });
  return response.data.data.map(adaptDoctor);
}

export async function getDoctorById(id: string): Promise<Doctor> {
  const response = await api.get<P2SingleResponse>(`/doctors/${id}`);
  return adaptDoctor(response.data.data);
}

export async function createDoctor(data: CreateDoctorRequest): Promise<Doctor> {
  const [firstName, ...rest] = data.name.split(' ');
  const payload = {
    first_name: firstName,
    last_name: rest.join(' ') || firstName,
    specialization: data.specialty,
    phone: data.phone,
    email: data.email,
    experience_years: data.experience,
    consultation_fee: data.consultationFee,
    employee_code: `EMP-${Date.now()}`,
    registration_number: `REG-${Date.now()}`,
    is_available: data.status === 'available',
  };
  const response = await api.post<P2SingleResponse>('/doctors', payload);
  return adaptDoctor(response.data.data);
}

export async function updateDoctor(id: string, data: CreateDoctorRequest): Promise<Doctor> {
  const [firstName, ...rest] = data.name.split(' ');
  const payload = {
    first_name: firstName,
    last_name: rest.join(' ') || firstName,
    specialization: data.specialty,
    phone: data.phone,
    email: data.email,
    experience_years: data.experience,
    consultation_fee: data.consultationFee,
    is_available: data.status === 'available',
  };
  const response = await api.put<P2SingleResponse>(`/doctors/${id}`, payload);
  return adaptDoctor(response.data.data);
}

export async function deleteDoctor(id: string): Promise<void> {
  await api.delete(`/doctors/${id}`);
}