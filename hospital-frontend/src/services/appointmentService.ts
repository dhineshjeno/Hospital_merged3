import api from './api';
import type {
  Appointment, CreateAppointmentRequest,
  ConsultationNotesRequest, AvailableSlot
} from '../types/appointment';

interface P2Appointment {
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  appointment_type: string;
  status: string;
  reason?: string;
  notes?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  consultation_id?: string;
}

interface P2ListResponse {
  success: boolean;
  data: P2Appointment[];
}

interface P2SingleResponse {
  success: boolean;
  data: P2Appointment;
}

interface P2AvailabilityResponse {
  success: boolean;
  data: {
    is_available: boolean;
    available_slots: { start: string; end: string }[];
    booked_slots: { start: string; end: string }[];
    booked_count: number;
    max_appointments_per_day: number;
  };
}

const STATUS_MAP: Record<string, Appointment['status']> = {
  Scheduled: 'scheduled',
  'Check-in': 'scheduled',
  'In-progress': 'in-progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
  'No-show': 'no-show',
};

const REVERSE_STATUS_MAP: Record<string, string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In-progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No-show',
};

function parseDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toISOString().split('T')[0];
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

function buildIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function addThirtyMin(isoStart: string): string {
  return new Date(new Date(isoStart).getTime() + 30 * 60000).toISOString();
}

function adaptAppointment(a: P2Appointment): Appointment {
  const { date, time } = parseDateTime(a.scheduled_start_at);
  const patientName = a.patient_first_name
    ? `${a.patient_first_name} ${a.patient_last_name ?? ''}`.trim()
    : '';
  const doctorName = a.doctor_first_name
    ? `${a.doctor_first_name} ${a.doctor_last_name ?? ''}`.trim()
    : '';
  return {
    id: a.appointment_id,
    patientId: a.patient_id,
    patientName,
    doctorId: a.doctor_id,
    doctorName,
    date,
    time,
    scheduledStartAt: a.scheduled_start_at,
    scheduledEndAt: a.scheduled_end_at,
    reason: a.reason ?? '',
    appointmentType: a.appointment_type,
    status: STATUS_MAP[a.status] ?? 'scheduled',
    consultationId: a.consultation_id,
  };
}

export async function getAppointments(filters?: {
  patientId?: string; doctorId?: string;
  dateFrom?: string; dateTo?: string;
}): Promise<Appointment[]> {
  const params: Record<string, string> = { limit: '100' };
  if (filters?.patientId) params.patient_id = filters.patientId;
  if (filters?.doctorId) params.doctor_id = filters.doctorId;
  if (filters?.dateFrom) params.date_from = filters.dateFrom;
  if (filters?.dateTo) params.date_to = filters.dateTo;
  const response = await api.get<P2ListResponse>('/appointments', { params });
  return response.data.data.map(adaptAppointment);
}

export async function getAppointmentById(id: string): Promise<Appointment> {
  const response = await api.get<P2SingleResponse>(`/appointments/${id}`);
  return adaptAppointment(response.data.data);
}

export async function createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
  const isoStart = buildIso(data.date, data.time);
  const isoEnd = addThirtyMin(isoStart);
  const payload = {
    patient_id: data.patientId,
    doctor_id: data.doctorId,
    scheduled_start_at: isoStart,
    scheduled_end_at: isoEnd,
    appointment_type: data.appointmentType || 'Consultation',
    reason: data.reason,
  };
  const response = await api.post<P2SingleResponse>('/appointments', payload);
  return adaptAppointment(response.data.data);
}

export async function updateAppointment(id: string, data: Partial<CreateAppointmentRequest>): Promise<Appointment> {
  const payload: Record<string, unknown> = {};
  if (data.status) payload.status = REVERSE_STATUS_MAP[data.status] ?? data.status;
  if (data.reason) payload.reason = data.reason;
  if (data.date && data.time) {
    const isoStart = buildIso(data.date, data.time);
    payload.scheduled_start_at = isoStart;
    payload.scheduled_end_at = addThirtyMin(isoStart);
  }
  const response = await api.put<P2SingleResponse>(`/appointments/${id}`, payload);
  return adaptAppointment(response.data.data);
}

export async function deleteAppointment(id: string): Promise<void> {
  await api.put(`/appointments/${id}/cancel`, { reason: 'Cancelled by staff' });
}

export async function getAvailableSlots(doctorId: string, date: string): Promise<AvailableSlot[]> {
  const response = await api.get<P2AvailabilityResponse>(
    '/appointments/availability',
    { params: { doctor_id: doctorId, date } }
  );
  const { available_slots } = response.data.data;
  return (available_slots || []).map((s) => ({
    start_time: new Date(s.start).toTimeString().slice(0, 5),
    end_time: new Date(s.end).toTimeString().slice(0, 5),
    is_available: true,
  }));
}

export async function addConsultationNotes(id: string, data: ConsultationNotesRequest): Promise<Appointment> {
  // EHR consultation is a separate endpoint — see ehrService
  // We just update the appointment status here
  const response = await api.put<P2SingleResponse>(`/appointments/${id}`, {
    status: 'Completed',
    notes: data.chiefComplaint || data.diagnosis || '',
  });
  return adaptAppointment(response.data.data);
}