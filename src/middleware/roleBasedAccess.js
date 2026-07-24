// src/middleware/roleBasedAccess.js
// Role-Based Access Control (RBAC) for Hospital Users
// Production-grade permission management

const { AppError } = require('./errorHandler');

// ============================================================================
// ROLE DEFINITIONS (Hospital Hierarchy)
// ============================================================================

const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  PHARMACIST: 'pharmacist',
  ACCOUNTANT: 'accountant',
  LAB_TECHNICIAN: 'lab_technician',
  STAFF: 'staff',
};

// ============================================================================
// PERMISSION MATRIX (What each role can do)
// ============================================================================

const ROLE_PERMISSIONS = {
  admin: {
    // User management
    users: ['create', 'read', 'update', 'delete'],
    doctors: ['create', 'read', 'update', 'delete'],
    nurses: ['create', 'read', 'update', 'delete'],

    // Hospital management
    hospital: ['read', 'update'],
    departments: ['create', 'read', 'update', 'delete'],
    wards: ['create', 'read', 'update', 'delete'],
    beds: ['create', 'read', 'update', 'delete'],

    // Patient management
    patients: ['create', 'read', 'update', 'delete'],
    patient_allergies: ['create', 'read', 'update', 'delete'],

    // Medical records
    consultations: ['create', 'read', 'update', 'delete'],
    vitals: ['create', 'read', 'update'],
    diagnoses: ['create', 'read', 'update'],
    prescriptions: ['create', 'read', 'update', 'cancel'],
    lab_orders: ['create', 'read', 'update', 'cancel'],
    lab_results: ['read'],

    // Appointments & Queue
    appointments: ['create', 'read', 'update', 'cancel'],
    queue: ['create', 'read', 'update', 'delete', 'manage'],

    // Admissions & Ward Management
    admissions: ['create', 'read', 'update'],
    discharges: ['create', 'read'],
    bed_transfers: ['create', 'read'],

    // Billing
    invoices: ['create', 'read', 'update', 'approve', 'cancel'],
    payments: ['create', 'read', 'update'],

    // Pharmacy
    purchases: ['create', 'read', 'approve'],
    patient_wallet: ['create', 'read', 'update'],
    medicines_dictionary: ['create', 'read', 'update'],
    medicines: ['create', 'read', 'update'],
    medicine_inventory: ['create', 'read', 'update'],

    // Inventory & Purchasing
    vendors: ['create', 'read', 'update', 'delete'],
    purchase_orders: ['create', 'read', 'update', 'approve', 'cancel'],

    // Audit & Compliance
    audit_logs: ['read'],
    consent_records: ['read'],

    // Search & Reports
    search: ['read'],
    reports: ['read'],

    // System
    system: ['restart', 'backup', 'configure'],
  },

  doctor: {
    // Own profile
    users: ['read:self', 'update:self'],

    // Patient care
    patients: ['create', 'read'],
    patient_allergies: ['create', 'read'],

    // Medical records (their own patients)
    consultations: ['create', 'read', 'update:own'],
    vitals: ['create', 'read'],
    diagnoses: ['create', 'read', 'update:own'],
    prescriptions: ['create', 'read', 'update:own'],
    lab_orders: ['create', 'read'],
    lab_results: ['read'],

    // Appointments & Queue
    appointments: ['create', 'read', 'update:own', 'cancel:own'],
    queue: ['read', 'update'],
    medicines: ['read'],
    doctor_schedules: ['read', 'update:own'],
    search: ['read'],
    reports: ['read'],

    // Admissions (their patients only)
    admissions: ['create', 'read'],
    discharges: ['create', 'read'],

    // Reports
    hospital: ['read'],
  },

  nurse: {
    // Own profile
    users: ['read:self', 'update:self'],

    // Patient care support
    patients: ['read'],
    patient_allergies: ['read'],

    // Vitals and monitoring
    vitals: ['create', 'read'],
    consultations: ['read'],
    diagnoses: ['read'],
    prescriptions: ['read'],

    // Appointments & Queue
    // NOTE: 'update:check_in' / 'update:call_next' were decorative — the scope
    // handler never implemented them, so they granted full 'update' anyway.
    // Stated explicitly now; narrow again once the scopes are implemented.
    appointments: ['read', 'update'],
    queue: ['read', 'update'],
    medicines: ['read'],
    search: ['read'],

    // Admissions & Ward
    admissions: ['read'],
    discharges: ['read'],
    bed_transfers: ['create', 'read'],
    wards: ['read'],
    beds: ['read'],

    // Lab & Tests
    lab_orders: ['read'],
    lab_results: ['read'],
  },

  pharmacist: {
    // Own profile
    users: ['read:self', 'update:self'],

    // Prescription fulfillment
    prescriptions: ['read', 'update'],
    // Pharmacist owns inventory: receive batches, adjust stock, dispense.
    purchases: ['create', 'read'],
    medicines_dictionary: ['create', 'read'],
    medicines: ['create', 'read', 'update'],
    medicine_inventory: ['create', 'read', 'update'],

    // Patients (for prescription context)
    patients: ['read'],

    // Reordering
    purchase_orders: ['create'],
    vendors: ['read'],
  },

  accountant: {
    // Own profile
    users: ['read:self', 'update:self'],

    // Billing
    invoices: ['create', 'read', 'update', 'approve'],
    payments: ['create', 'read', 'update'],

    // Patient info (billing context only)
    patients: ['read:limited'],

    // Purchase & Inventory
    purchase_orders: ['read', 'approve'],
    reports: ['read'],
    vendors: ['read'],

    // Reports
    hospital: ['read'],
  },

  lab_technician: {
    // Own profile
    users: ['read:self', 'update:self'],

    // Lab work
    // 'update:collect_sample' was decorative (scope never implemented →
    // granted full 'update'). Stated explicitly.
    lab_orders: ['read', 'update'],
    lab_results: ['create', 'read'],
    lab_test_catalog: ['read'],

    // Patient info (lab context only)
    patients: ['read:limited'],
  },

  staff: {
    // Own profile
    users: ['read:self', 'update:self'],

    // General access
    patients: ['read:limited'],
    appointments: ['read'],
    hospital: ['read'],
    lab_orders: ['read'],
    lab_results: ['read'],

    // Reception desk: patient check-in is the ONLY path that creates queue
    // entries — no role could do it before, so the queue was unusable.
    queue: ['create', 'read', 'update'],
  },
};

// ============================================================================
// MIDDLEWARE: Require Specific Role
// ============================================================================

/**
 * Middleware: Check if user has required role
 * Usage: app.get('/admin/users', requireRole('admin'), controller)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
}

// ============================================================================
// MIDDLEWARE: Require Specific Permission
// ============================================================================

/**
 * Middleware: Check if user has permission for resource and action
 * Usage: app.get('/patients', requirePermission('patients', 'read'), controller)
 */
function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const userRole = req.user.role;
    const permissions = ROLE_PERMISSIONS[userRole];

    if (!permissions) {
      throw new AppError('Invalid user role', 403, 'FORBIDDEN');
    }

    const resourcePermissions = permissions[resource];

    if (!resourcePermissions) {
      throw new AppError(`Access to ${resource} not allowed for ${userRole}`, 403, 'FORBIDDEN');
    }

    // Check for exact permission match
    if (!resourcePermissions.includes(action)) {
      // Check for wildcard permissions (e.g., 'update:own')
      const hasSpecialPermission = resourcePermissions.some((perm) => {
        const [permAction, scope] = perm.split(':');
        if (permAction !== action) return false;

        // Handle scoped permissions
        if (scope === 'self') {
          return req.params.id === req.user.userId;
        }
        if (scope === 'own') {
          return req.body.userId === req.user.userId || req.params.doctorId === req.user.userId;
        }
        if (scope === 'limited') {
          // Limited access - allowed but may show less data
          return true;
        }

        // FAIL CLOSED on unrecognized scopes.
        // Previously this returned true, which meant a permission like
        // 'update:call_next' silently granted FULL 'update' — any scope this
        // function doesn't understand became an unrestricted grant. Unknown
        // scope now = denied; implement the scope explicitly above to allow it.
        return false;
      });

      if (!hasSpecialPermission) {
        throw new AppError(
          `Permission denied: ${action} ${resource} not allowed for ${userRole}`,
          403,
          'FORBIDDEN'
        );
      }
    }

    // Attach permissions to request for later use
    req.userPermissions = {
      resource,
      action,
      role: userRole,
    };

    next();
  };
}

// ============================================================================
// HELPER: Check Permission Programmatically
// ============================================================================

/**
 * Check if user has permission (can be used in controllers)
 * Usage: if (hasPermission(req.user.role, 'patients', 'delete')) { ... }
 */
function hasPermission(role, resource, action) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
}

// ============================================================================
// HELPER: Get User Role Permissions
// ============================================================================

/**
 * Get all permissions for a role
 * Usage: const perms = getRolePermissions('doctor')
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || {};
}

// ============================================================================
// HELPER: Get All Available Roles
// ============================================================================

function getAllRoles() {
  return Object.values(ROLES);
}

// ============================================================================
// AUTHORIZATION: Prevent Cross-Hospital Access
// ============================================================================

/**
 * Middleware: Ensure user only accesses their own hospital
 * Usage: app.use(requireSameHospital())
 */
function requireSameHospital() {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    if (!req.hospitalId) {
      throw new AppError('Hospital ID required', 400, 'INVALID_REQUEST');
    }

    if (req.user.hospitalId !== req.hospitalId) {
      throw new AppError('Access denied: Hospital mismatch', 403, 'FORBIDDEN');
    }

    next();
  };
}

// ============================================================================
// AUTHORIZATION: Doctor can only access their own patients
// ============================================================================

/**
 * Middleware: Doctor can only access patients they are caring for
 */
function doctorCanAccessPatient(req, res, next) {
  if (req.user.role !== 'doctor') {
    // Non-doctors don't have this restriction
    return next();
  }

  // For doctors: verify they are assigned to this patient
  // This should be checked against the database
  // Implementation depends on your patient-doctor relationship table

  next();
}

// ============================================================================
// AUDIT: Log permission check for sensitive operations
// ============================================================================

/**
 * Middleware: Audit all permission checks for sensitive operations
 */
function auditPermissionCheck(req, res, next) {
  // This is called after permission is granted
  // Log who accessed what resource
  if (req.user && ['delete', 'update', 'create'].includes(req.method)) {
    console.log(`[AUDIT] ${req.user.role}:${req.user.userId} performed ${req.method} on ${req.path}`);
  }

  next();
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  // Roles
  ROLES,
  getAllRoles,

  // Permissions
  ROLE_PERMISSIONS,
  getRolePermissions,
  hasPermission,

  // Middleware
  requireRole,
  requirePermission,
  requireSameHospital,
  doctorCanAccessPatient,
  auditPermissionCheck,
};