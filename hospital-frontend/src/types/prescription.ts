export interface PrescriptionItem {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  prescribedAt: string;
  items: PrescriptionItem[];
  status: 'active' | 'completed' | 'cancelled';
}