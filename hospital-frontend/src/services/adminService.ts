import api from './api';
import type { Hospital } from '../types/auth';
import type { StaffUser, CustomRole, AuditLogEntry } from '../types/admin';

export async function updateHospital(id: number, data: Partial<Hospital>): Promise<Hospital> {
  const response = await api.put<{ hospital: Hospital }>(`/hospitals/${id}`, data);
  return response.data.hospital;
}

export async function getStaffUsers(): Promise<StaffUser[]> {
  const response = await api.get<{ users: StaffUser[] }>('/users');
  return response.data.users;
}

export async function createStaffUser(data: { name: string; email: string; password: string; role: string }): Promise<StaffUser> {
  const response = await api.post<{ user: StaffUser }>('/users', data);
  return response.data.user;
}

export async function updateStaffUser(id: number, data: Partial<StaffUser>): Promise<StaffUser> {
  const response = await api.put<{ user: StaffUser }>(`/users/${id}`, data);
  return response.data.user;
}

export async function deleteStaffUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function getCustomRoles(): Promise<CustomRole[]> {
  const response = await api.get<{ roles: CustomRole[] }>('/roles');
  return response.data.roles;
}

export async function createCustomRole(data: { name: string; description: string; permissions: string[] }): Promise<CustomRole> {
  const response = await api.post<{ role: CustomRole }>('/roles', data);
  return response.data.role;
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const response = await api.get<{ logs: AuditLogEntry[] }>('/audit-logs');
  return response.data.logs;
}