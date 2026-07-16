import api from './api';
import type { LoginResponse, RegisterRequest } from '../types/auth';

interface P2AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      hospitalId?: string;
    };
  };
}

function adaptResponse(res: P2AuthResponse): LoginResponse {
  const { user } = res.data;
  // Store hospital ID so every subsequent request sends the header
  if (user.hospitalId) {
    localStorage.setItem('hospitalId', user.hospitalId);
  }
  return {
    token: res.data.token,
    user: {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
    },
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post<P2AuthResponse>('/auth/login', { email, password });
  return adaptResponse(response.data);
}

export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const [firstName, ...rest] = data.name.split(' ');
  const lastName = rest.join(' ') || firstName;
  const response = await api.post<P2AuthResponse>('/auth/register', {
    email: data.email,
    password: data.password,
    phone: data.phone,
    firstName,
    lastName,
    role: 'staff',
  });
  return adaptResponse(response.data);
}

export async function forgotPassword(data: { email: string }): Promise<void> {
  await api.post('/auth/forgot-password', data);
}

export async function verifyOtp(data: { email: string; otp: string }): Promise<void> {
  await api.post('/auth/verify-otp', data);
}

export async function resetPassword(data: { email: string; otp: string; newPassword: string }): Promise<void> {
  await api.post('/auth/reset-password', data);
}