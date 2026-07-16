// src/constants/roles.js
// Hospital User Roles and Descriptions
// Used throughout the system for RBAC

/**
 * Hospital User Roles
 * Each role has specific permissions defined in middleware/roleBasedAccess.js
 */
const ROLES = {
  /**
   * ADMIN
   * Hospital administrator with full system access
   * Can manage users, departments, settings, and audit logs
   */
  ADMIN: {
    value: 'admin',
    label: 'Administrator',
    description: 'Full system access and hospital management',
    level: 1, // Highest priority
  },

  /**
   * DOCTOR
   * Medical doctor or physician
   * Can see patients, create consultations, order tests, prescribe medicines
   */
  DOCTOR: {
    value: 'doctor',
    label: 'Doctor',
    description: 'Patient diagnosis, treatment, and prescription',
    level: 2,
  },

  /**
   * NURSE
   * Registered nurse
   * Can assist doctors, record vitals, manage patient care
   */
  NURSE: {
    value: 'nurse',
    label: 'Nurse',
    description: 'Patient care support and vital monitoring',
    level: 3,
  },

  /**
   * PHARMACIST
   * Licensed pharmacist
   * Can dispense medicines and manage pharmacy inventory
   */
  PHARMACIST: {
    value: 'pharmacist',
    label: 'Pharmacist',
    description: 'Prescription fulfillment and medicine management',
    level: 4,
  },

  /**
   * ACCOUNTANT
   * Billing and accounts staff
   * Can manage invoices, payments, and billing records
   */
  ACCOUNTANT: {
    value: 'accountant',
    label: 'Accountant',
    description: 'Billing, invoicing, and payment management',
    level: 5,
  },

  /**
   * LAB_TECHNICIAN
   * Laboratory technician
   * Can collect samples and enter lab test results
   */
  LAB_TECHNICIAN: {
    value: 'lab_technician',
    label: 'Lab Technician',
    description: 'Lab sample collection and result entry',
    level: 6,
  },

  /**
   * STAFF
   * General hospital staff
   * Can access limited information and perform basic tasks
   */
  STAFF: {
    value: 'staff',
    label: 'Staff',
    description: 'General hospital staff with limited access',
    level: 7, // Lowest priority
  },
};

/**
 * Get role by value
 * Usage: getRoleByValue('doctor')
 */
function getRoleByValue(value) {
  return Object.values(ROLES).find((role) => role.value === value);
}

/**
 * Get all roles as array
 * Usage: const allRoles = getAllRoles()
 */
function getAllRoles() {
  return Object.values(ROLES);
}

/**
 * Get all role values as array
 * Usage: const roleValues = getAllRoleValues()
 */
function getAllRoleValues() {
  return Object.values(ROLES).map((role) => role.value);
}

/**
 * Check if role exists
 * Usage: if (isValidRole('doctor')) { ... }
 */
function isValidRole(roleValue) {
  return getAllRoleValues().includes(roleValue);
}

/**
 * Check if roleA has higher priority than roleB
 * Lower level number = higher priority
 * Usage: if (hasHigherPriority('admin', 'doctor')) { ... }
 */
function hasHigherPriority(roleA, roleB) {
  const roleAObj = getRoleByValue(roleA);
  const roleBObj = getRoleByValue(roleB);

  if (!roleAObj || !roleBObj) return false;

  return roleAObj.level < roleBObj.level;
}

/**
 * Check if roleA and roleB are equivalent priority
 */
function isEquivalentPriority(roleA, roleB) {
  const roleAObj = getRoleByValue(roleA);
  const roleBObj = getRoleByValue(roleB);

  if (!roleAObj || !roleBObj) return false;

  return roleAObj.level === roleBObj.level;
}

/**
 * Hospital Department Roles (optional - for organizing doctors)
 * Can be used for department head assignments
 */
const DEPARTMENT_ROLES = {
  HEAD: 'department_head',
  SENIOR: 'senior_doctor',
  JUNIOR: 'junior_doctor',
};

/**
 * User Status
 */
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  ON_LEAVE: 'on_leave',
};

/**
 * Permissions (used for granular access control)
 * Structure: <resource>:<action>[:<scope>]
 * Examples: read:patients, create:appointments:own, update:prescriptions
 */
const PERMISSIONS = {
  // Patient permissions
  PATIENT_CREATE: 'create:patients',
  PATIENT_READ: 'read:patients',
  PATIENT_UPDATE: 'update:patients',
  PATIENT_DELETE: 'delete:patients',
  PATIENT_READ_LIMITED: 'read:patients:limited', // Limited fields

  // Doctor permissions
  DOCTOR_CREATE: 'create:doctors',
  DOCTOR_READ: 'read:doctors',
  DOCTOR_UPDATE: 'update:doctors',
  DOCTOR_DELETE: 'delete:doctors',

  // Appointment permissions
  APPOINTMENT_CREATE: 'create:appointments',
  APPOINTMENT_READ: 'read:appointments',
  APPOINTMENT_UPDATE: 'update:appointments',
  APPOINTMENT_UPDATE_OWN: 'update:appointments:own', // Only own appointments
  APPOINTMENT_CANCEL: 'cancel:appointments',
  APPOINTMENT_CANCEL_OWN: 'cancel:appointments:own',

  // Consultation permissions
  CONSULTATION_CREATE: 'create:consultations',
  CONSULTATION_READ: 'read:consultations',
  CONSULTATION_UPDATE: 'update:consultations',
  CONSULTATION_UPDATE_OWN: 'update:consultations:own',

  // Prescription permissions
  PRESCRIPTION_CREATE: 'create:prescriptions',
  PRESCRIPTION_READ: 'read:prescriptions',
  PRESCRIPTION_UPDATE: 'update:prescriptions',
  PRESCRIPTION_DISPENSE: 'dispense:prescriptions',
  PRESCRIPTION_CANCEL: 'cancel:prescriptions',

  // Lab permissions
  LAB_ORDER_CREATE: 'create:lab_orders',
  LAB_ORDER_READ: 'read:lab_orders',
  LAB_ORDER_CANCEL: 'cancel:lab_orders',
  LAB_RESULT_CREATE: 'create:lab_results',
  LAB_RESULT_READ: 'read:lab_results',

  // Billing permissions
  INVOICE_CREATE: 'create:invoices',
  INVOICE_READ: 'read:invoices',
  INVOICE_UPDATE: 'update:invoices',
  INVOICE_APPROVE: 'approve:invoices',
  PAYMENT_CREATE: 'create:payments',
  PAYMENT_READ: 'read:payments',

  // Admission permissions
  ADMISSION_CREATE: 'create:admissions',
  ADMISSION_READ: 'read:admissions',
  ADMISSION_UPDATE: 'update:admissions',
  DISCHARGE_CREATE: 'create:discharges',

  // Vital permissions
  VITAL_CREATE: 'create:vitals',
  VITAL_READ: 'read:vitals',

  // User management
  USER_CREATE: 'create:users',
  USER_READ: 'read:users',
  USER_UPDATE: 'update:users',
  USER_DELETE: 'delete:users',
  USER_UPDATE_SELF: 'update:users:self', // Only own profile

  // Audit permissions
  AUDIT_READ: 'read:audit_logs',

  // System permissions
  SYSTEM_MANAGE: 'manage:system',
};

/**
 * Get permission by key
 * Usage: const permission = getPermission('PATIENT_READ')
 */
function getPermission(key) {
  return PERMISSIONS[key] || null;
}

/**
 * Get all permissions
 */
function getAllPermissions() {
  return Object.values(PERMISSIONS);
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  ROLES,
  getRoleByValue,
  getAllRoles,
  getAllRoleValues,
  isValidRole,
  hasHigherPriority,
  isEquivalentPriority,

  DEPARTMENT_ROLES,
  USER_STATUS,

  PERMISSIONS,
  getPermission,
  getAllPermissions,
};