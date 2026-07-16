export interface Vitals {
  bp: string;
  temperature: string;
  weight: string;
  oxygen: string;
}

export interface Prescription {
  medicine: string;
  dosage: string;
  frequency: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  reason: string;
  appointmentType: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'in-progress';
  hospitalId?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  vitals?: Vitals;
  prescriptions?: Prescription[];
  consultationId?: string;
}

export interface AppointmentListResponse { appointments: Appointment[]; }
export interface AppointmentResponse { appointment: Appointment; }

export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  reason: string;
  appointmentType: 'Consultation' | 'Follow-up' | 'Emergency';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}

export interface ConsultationNotesRequest {
  chiefComplaint?: string;
  diagnosis?: string;
  vitals?: Vitals;
  prescriptions?: Prescription[];
  status: 'completed';
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}