// src/validators/billingValidator.js
// Billing Validator - Input validation for invoices and payments

/**
 * Validate invoice creation
 */
function validateCreateInvoice(data) {
  const errors = [];

  if (!data.patient_id) errors.push('patient_id is required');
  if (!data.appointment_id) errors.push('appointment_id is required');

  if (!data.services || !Array.isArray(data.services) || data.services.length === 0) {
    errors.push('services must be a non-empty array');
  } else {
    data.services.forEach((service, index) => {
      if (!service.service_name || !String(service.service_name).trim()) {
        errors.push(`services[${index}].service_name is required`);
      }

      if (!service.quantity || parseInt(service.quantity) <= 0) {
        errors.push(`services[${index}].quantity must be greater than 0`);
      }

      if (!service.rate || parseFloat(service.rate) <= 0) {
        errors.push(`services[${index}].rate must be greater than 0`);
      }
    });
  }

  if (data.discount_percent !== undefined && data.discount_percent !== null) {
    const discount = parseFloat(data.discount_percent);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      errors.push('discount_percent must be between 0 and 100');
    }
  }

  if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
    if (String(data.notes).trim().length > 500) {
      errors.push('notes must be 500 characters or less');
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
      errors,
    };
  }

  return { valid: true };
}

// ============================================================================

/**
 * Validate payment
 */
function validatePayment(data) {
  const errors = [];

  if (!data.amount || parseFloat(data.amount) <= 0) {
    errors.push('amount must be greater than 0');
  } else if (parseFloat(data.amount) > 10000000) {
    errors.push('amount seems invalid (> 10,000,000)');
  }

  if (!data.payment_method || !String(data.payment_method).trim()) {
    errors.push('payment_method is required');
  } else {
    const validMethods = ['Cash', 'Cheque', 'Card', 'Net Banking', 'UPI', 'Insurance'];
    if (!validMethods.includes(data.payment_method.trim())) {
      errors.push(`payment_method must be one of: ${validMethods.join(', ')}`);
    }
  }

  if (data.transaction_id !== undefined && data.transaction_id !== null && data.transaction_id !== '') {
    if (String(data.transaction_id).trim().length > 100) {
      errors.push('transaction_id must be 100 characters or less');
    }
  }

  if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
    if (String(data.notes).trim().length > 300) {
      errors.push('notes must be 300 characters or less');
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
      errors,
    };
  }

  return { valid: true };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  validateCreateInvoice,
  validatePayment,
};