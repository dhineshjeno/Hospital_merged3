import api from './api';
import type { Ward, Bed, Admission, OccupancyReport } from '../types/ward';

interface P2Ward {
  ward_id: string;
  name: string;
  ward_type: string;
  total_beds: number;
  available_beds: number;
  description?: string;
  status: string;
}

interface P2Room {
  room_id: string;
  ward_id: string;
  room_number: string;
  room_type: string;
  total_beds: number;
  available_beds: number;
  status: string;
}

interface P2Bed {
  bed_id: string;
  room_id: string;
  ward_id?: string;
  bed_number: string;
  status: string;
}

interface P2Admission {
  admission_id: string;
  patient_id: string;
  bed_id: string;
  doctor_id: string;
  admission_reason: string;
  admission_type: string;
  status: string;
  admission_date: string;
  discharge_date?: string;
  expected_stay_days?: number;
  chief_complaint?: string;
}

// Cache for name lookups
const patientNameCache = new Map<string, string>();
const doctorNameCache = new Map<string, string>();

async function resolvePatientName(id: string): Promise<string> {
  if (patientNameCache.has(id)) return patientNameCache.get(id)!;
  try {
    const r = await api.get<{ success: boolean; data: { first_name: string; last_name: string } }>(`/patients/${id}`);
    const name = `${r.data.data.first_name} ${r.data.data.last_name}`.trim();
    patientNameCache.set(id, name);
    return name;
  } catch { return 'Unknown patient'; }
}

async function resolveDoctorName(id: string): Promise<string> {
  if (doctorNameCache.has(id)) return doctorNameCache.get(id)!;
  try {
    const r = await api.get<{ success: boolean; data: { first_name?: string; last_name?: string; name?: string } }>(`/doctors/${id}`);
    const d = r.data.data;
    const name = d.name ?? `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim();
    doctorNameCache.set(id, name);
    return name;
  } catch { return 'Unknown doctor'; }
}

function adaptWard(w: P2Ward): Ward {
  return {
    id: w.ward_id,
    wardCode: w.ward_id.slice(0, 8).toUpperCase(),
    wardName: w.name,
    wardType: w.ward_type.toLowerCase() as Ward['wardType'],
    totalBeds: w.total_beds,
    availableBeds: w.available_beds,
    occupiedBeds: w.total_beds - w.available_beds,
    isActive: w.status === 'Active',
  };
}

function adaptBed(b: P2Bed): Bed {
  return {
    id: b.bed_id,
    wardId: b.ward_id ?? '',
    bedNumber: b.bed_number,
    status: b.status as Bed['status'],
  };
}

async function adaptAdmission(a: P2Admission): Promise<Admission> {
  const [patientName, doctorName] = await Promise.all([
    resolvePatientName(a.patient_id),
    resolveDoctorName(a.doctor_id),
  ]);
  return {
    id: a.admission_id,
    patientId: a.patient_id,
    patientName,
    wardId: '',
    wardName: '',
    bedId: a.bed_id,
    bedNumber: '',
    admittingDoctorId: a.doctor_id,
    admittingDoctorName: doctorName,
    admissionDate: a.admission_date?.split('T')[0] ?? '',
    diagnosis: a.chief_complaint ?? a.admission_reason,
    status: a.status === 'Active' ? 'active' : 'discharged',
  };
}

export async function getWards(): Promise<Ward[]> {
  const response = await api.get<{ success: boolean; data: P2Ward[] }>('/wards');
  return response.data.data.map(adaptWard);
}

export async function getWardById(id: string): Promise<Ward> {
  const wards = await getWards();
  const found = wards.find((w) => w.id === id);
  if (found) return found;
  throw new Error('Ward not found');
}

export async function getRoomsForWard(wardId: string): Promise<P2Room[]> {
  const response = await api.get<{ success: boolean; data: P2Room[] }>(`/wards/${wardId}/rooms`);
  return response.data.data;
}

export async function getBedsForWard(wardId: string, status?: string): Promise<Bed[]> {
  const rooms = await getRoomsForWard(wardId);
  const allBeds: Bed[] = [];
  await Promise.all(rooms.map(async (room) => {
    const response = await api.get<{ success: boolean; data: P2Bed[] }>(
      `/wards/${wardId}/rooms/${room.room_id}/beds`
    );
    const beds = response.data.data.map((b) => adaptBed({ ...b, ward_id: wardId }));
    allBeds.push(...beds);
  }));
  if (status) return allBeds.filter((b) => b.status === status);
  return allBeds;
}

export async function getAdmissions(filters?: {
  patientId?: string; status?: string;
}): Promise<Admission[]> {
  const params: Record<string, string> = {};
  if (filters?.patientId) params.patient_id = filters.patientId;
  if (filters?.status) params.status = filters.status === 'active' ? 'Active' : 'Discharged';
  const response = await api.get<{ success: boolean; data: P2Admission[] }>(
    '/wards/admissions', { params }
  );
  return Promise.all(response.data.data.map(adaptAdmission));
}

export async function getAdmissionById(id: string): Promise<Admission> {
  const all = await getAdmissions();
  const found = all.find((a) => a.id === id);
  if (found) return found;
  throw new Error('Admission not found');
}

export async function createAdmission(data: {
  patientId: string; bedId: string; wardId: string;
  admittingDoctorId: string; admissionDate: string;
  expectedDischargeDate?: string; diagnosis?: string;
}): Promise<Admission> {
  const payload = {
    patient_id: data.patientId,
    bed_id: data.bedId,
    doctor_id: data.admittingDoctorId,
    admission_reason: data.diagnosis || 'General admission',
    admission_type: 'Planned',
    chief_complaint: data.diagnosis,
    expected_stay_days: data.expectedDischargeDate
      ? Math.ceil((new Date(data.expectedDischargeDate).getTime() - new Date(data.admissionDate).getTime()) / 86400000)
      : undefined,
  };
  const response = await api.post<{ success: boolean; data: P2Admission }>('/wards/admissions', payload);
  return adaptAdmission(response.data.data);
}

export async function dischargePatient(admissionId: string, data: {
  dischargedByDoctorId: string; dischargeNotes?: string;
}): Promise<Admission> {
  const response = await api.put<{ success: boolean; data: P2Admission }>(
    `/wards/admissions/${admissionId}/discharge`,
    { discharge_reason: data.dischargeNotes, notes: data.dischargeNotes }
  );
  return adaptAdmission(response.data.data);
}

export async function transferPatient(admissionId: string, data: {
  bedId: string; wardId: string; reason?: string;
}): Promise<Admission> {
  const response = await api.put<{ success: boolean; data: P2Admission }>(
    `/wards/admissions/${admissionId}/transfer`,
    { new_bed_id: data.bedId, transfer_reason: data.reason }
  );
  return adaptAdmission(response.data.data);
}

export async function createWard(data: {
  name: string; wardType: string; totalBeds: number; description?: string;
}): Promise<Ward> {
  const response = await api.post<{ success: boolean; data: P2Ward }>('/wards', {
    name: data.name,
    ward_type: data.wardType,
    total_beds: data.totalBeds,
    description: data.description,
  });
  return adaptWard(response.data.data);
}

export async function createRoom(wardId: string, data: {
  roomNumber: string; roomType: string; totalBeds: number;
}): Promise<P2Room> {
  const response = await api.post<{ success: boolean; data: P2Room }>(`/wards/${wardId}/rooms`, {
    room_number: data.roomNumber,
    room_type: data.roomType,
    total_beds: data.totalBeds,
  });
  return response.data.data;
}

export async function createBed(wardId: string, roomId: string, bedNumber: string): Promise<Bed> {
  const response = await api.post<{ success: boolean; data: P2Bed }>(
    `/wards/${wardId}/rooms/${roomId}/beds`,
    { bed_number: bedNumber }
  );
  return adaptBed({ ...response.data.data, ward_id: wardId });
}

export async function getOccupancyReport(): Promise<OccupancyReport> {
  const wards = await getWards();
  const totalBeds = wards.reduce((s, w) => s + w.totalBeds, 0);
  const availableBeds = wards.reduce((s, w) => s + w.availableBeds, 0);
  const occupiedBeds = totalBeds - availableBeds;
  return {
    summary: {
      total_wards: wards.length,
      total_beds: totalBeds,
      available_beds: availableBeds,
      occupied_beds: occupiedBeds,
      overall_occupancy_pct: totalBeds > 0 ? parseFloat(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0,
    },
    wards: wards.map((w) => ({
      ward_id: w.id,
      ward_name: w.wardName,
      ward_type: w.wardType,
      total_beds: w.totalBeds,
      available_beds: w.availableBeds,
      occupied_beds: w.occupiedBeds,
      occupancy_pct: w.totalBeds > 0 ? parseFloat(((w.occupiedBeds / w.totalBeds) * 100).toFixed(1)) : 0,
    })),
  };
}