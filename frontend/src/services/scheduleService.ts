import api from './api';
import type { DoctorSchedule, AvailableSlotsResponse } from '../types/schedule';

interface P3Schedule {
  doctor_schedule_id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

function adaptSchedule(s: P3Schedule): DoctorSchedule {
  return {
    id: s.doctor_schedule_id,
    doctorId: s.doctor_id,
    dayOfWeek: s.day_of_week,
    startTime: s.start_time,
    endTime: s.end_time,
    slotDurationMinutes: s.slot_duration_minutes,
    isActive: s.is_active,
  };
}

export async function getDoctorSchedules(doctorId: string): Promise<DoctorSchedule[]> {
  const response = await api.get<{ status: string; data: P3Schedule[] }>(`/doctors/${doctorId}/schedules`);
  return response.data.data.map(adaptSchedule);
}

export async function getAvailableSlots(doctorId: string, date: string): Promise<AvailableSlotsResponse> {
  const response = await api.get<{ status: string; data: AvailableSlotsResponse }>(
    `/doctors/${doctorId}/available-slots`, { params: { date } }
  );
  return response.data.data;
}