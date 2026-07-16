export interface Ward {
  id: string;
  wardCode: string;
  wardName: string;
  wardType: 'general' | 'icu' | 'emergency' | 'maternity' | 'pediatric' | 'surgical' | 'psychiatric';
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  floor?: string;
  isActive: boolean;
}

export interface Bed {
  id: string;
  wardId: string;
  bedNumber: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  bedType?: string;
}

export interface Admission {
  id: string;
  patientId: string;
  patientName: string;
  wardId: string;
  wardName: string;
  bedId: string;
  bedNumber: string;
  admittingDoctorId: string;
  admittingDoctorName: string;
  admissionDate: string;
  expectedDischargeDate?: string;
  diagnosis?: string;
  status: 'active' | 'transferred' | 'discharged';
}

export interface OccupancyReport {
  summary: {
    total_wards: number;
    total_beds: number;
    available_beds: number;
    occupied_beds: number;
    overall_occupancy_pct: number;
  };
  wards: {
    ward_id: string;
    ward_name: string;
    ward_type: string;
    total_beds: number;
    available_beds: number;
    occupied_beds: number;
    occupancy_pct: number;
  }[];
}