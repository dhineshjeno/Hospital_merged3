import api from './api';
import type { Hospital } from '../types/auth';

export async function getHospitals(): Promise<Hospital[]> {
  const response = await api.get<{ hospitals: Hospital[] }>('/hospitals');
  return response.data.hospitals;
}