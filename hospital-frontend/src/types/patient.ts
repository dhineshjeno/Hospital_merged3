export interface Patient {
  id: string;
  medicalRecordNumber: string;
  name: string;
  age: number;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email?: string;
  bloodGroup: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  status: 'admitted' | 'discharged' | 'outpatient';
  hospitalId?: string;
  registeredAt?: string;
  isActive?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

export interface PatientListResponse { patients: Patient[]; }
export interface PatientResponse { patient: Patient; }
export interface CreatePatientRequest {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  bloodGroup: string;
  address: string;
  status: 'admitted' | 'discharged' | 'outpatient';
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}