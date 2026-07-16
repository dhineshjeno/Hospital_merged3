export interface LabResult {
  id: number;
  patientId: number;
  patientName: string;
  doctorName: string;
  testName: string;
  date: string;
  status: 'pending' | 'completed';
  value: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  hospitalId: number;
}

export interface LabResultListResponse { labResults: LabResult[]; }
export interface LabResultResponse { labResult: LabResult; }