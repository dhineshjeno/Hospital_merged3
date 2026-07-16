export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  experience: number;
  consultationFee?: number;
  status: 'available' | 'on-leave' | 'in-surgery';
  isAvailable?: boolean;
}

export interface DoctorListResponse { doctors: Doctor[]; }
export interface DoctorResponse { doctor: Doctor; }
export interface CreateDoctorRequest {
  name: string;
  specialty: string;
  phone: string;
  email: string;
  experience: number;
  status: 'available' | 'on-leave' | 'in-surgery';
  consultationFee?: number;
}