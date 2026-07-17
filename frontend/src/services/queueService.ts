import api from './api';
import type { QueueEntry, CheckInRequest, UpdateQueueStatusRequest } from '../types/queue';

interface P3QueueEntry {
  queue_entry_id: string;
  queue_number: number;
  patient_id: string;
  doctor_id: string;
  priority: string;
  status: string;
  queue_date: string;
  checked_in_at: string;
  estimated_wait_minutes?: number;
}

interface P3QueueResponse {
  status: string;
  data: {
    doctor_id: string;
    queue_date: string;
    entries: P3QueueEntry[];
  };
}

const P3_STATUS_MAP: Record<string, QueueEntry['status']> = {
  waiting: 'waiting', called: 'called', in_service: 'called',
  done: 'completed', no_show: 'completed', skipped: 'completed',
};

let patientNameCache = new Map<string, string>();

async function resolvePatientName(patientId: string): Promise<string> {
  let name = patientNameCache.get(patientId);
  if (!name) {
    try {
      const r = await api.get<{ status: string; data: { first_name: string; last_name: string } }>(`/patients/${patientId}`);
      name = `${r.data.data.first_name} ${r.data.data.last_name}`.trim();
      patientNameCache.set(patientId, name);
    } catch { name = 'Unknown patient'; }
  }
  return name;
}

function adaptEntry(e: P3QueueEntry, patientName: string): QueueEntry {
  return {
    id: e.queue_entry_id as unknown as number,
    tokenNumber: e.queue_number,
    patientName,
    priority: e.priority === 'urgent' || e.priority === 'emergency' ? 'emergency' : 'normal',
    status: P3_STATUS_MAP[e.status] ?? 'waiting',
    checkedInAt: e.checked_in_at || new Date().toISOString(),
    hospitalId: 1,
  };
}

let currentDoctorId: string | null = null;

export function setQueueDoctorId(doctorId: string) {
  currentDoctorId = doctorId;
}

export async function getQueue(): Promise<QueueEntry[]> {
  if (!currentDoctorId) return [];
  const response = await api.get<P3QueueResponse>(`/doctors/${currentDoctorId}/queue`);
  const entries = response.data.data.entries;
  const resolved = await Promise.all(
    entries.map(async (e) => {
      const name = await resolvePatientName(e.patient_id);
      return adaptEntry(e, name);
    })
  );
  return resolved;
}

export async function checkIn(data: CheckInRequest): Promise<QueueEntry> {
  if (!currentDoctorId) throw new Error('No doctor selected for queue');
  const payload = {
    patient_id: '00000000-0000-0000-0000-000000000000',
    doctor_id: currentDoctorId,
    priority: data.priority === 'emergency' ? 'urgent' : 'normal',
  };
  const response = await api.post<{ status: string; data: P3QueueEntry }>('/queue-entries', payload);
  const name = await resolvePatientName(response.data.data.patient_id);
  return adaptEntry(response.data.data, name);
}

export async function updateQueueStatus(id: number, data: UpdateQueueStatusRequest): Promise<QueueEntry> {
  const statusMap: Record<string, string> = { waiting: 'waiting', called: 'called', completed: 'done' };
  const response = await api.patch<{ status: string; data: P3QueueEntry }>(
    `/queue-entries/${id}/status`,
    { status: statusMap[data.status] || data.status }
  );
  const name = await resolvePatientName(response.data.data.patient_id);
  return adaptEntry(response.data.data, name);
}