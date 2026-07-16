export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
  hospitalId: number;
}

export interface CustomRole {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface AuditLogEntry {
  id: number;
  action: string;
  user: string;
  resource: string;
  timestamp: string;
}