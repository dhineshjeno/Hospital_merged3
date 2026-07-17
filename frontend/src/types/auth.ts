export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  hospitalId?: string;
  patientId?: string;
  doctorId?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Hospital {
  id: number;
  name: string;
  subscriptionStatus?: 'trial' | 'active' | 'suspended';
  openingTime?: string;
  closingTime?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bloodGroup: string;
  address: string;
}

export interface ForgotPasswordRequest { email: string; }
export interface VerifyOtpRequest { email: string; otp: string; }
export interface ResetPasswordRequest { email: string; otp: string; newPassword: string; }