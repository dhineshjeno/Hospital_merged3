export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface AvailableSlotsResponse {
  date: string;
  doctor_id: string;
  slots: AvailableSlot[];
}