// src/middleware/validation.js

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (password.length < 8) return { valid: false, error: 'Min 8 chars' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Need uppercase' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Need number' };
  return { valid: true };
};

const validatePhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

const validateRegister = (req, res, next) => {
  const { firstName, lastName, email, phone, password } = req.body;

  const errors = [];

  // Required fields
  if (!firstName || firstName.trim().length < 2) {
    errors.push('First name must be at least 2 characters');
  }
  if (!lastName || lastName.trim().length < 2) {
    errors.push('Last name must be at least 2 characters');
  }

  // Email validation
  if (!validateEmail(email)) {
    errors.push('Invalid email format');
  }

  // Phone validation (India format: 10 digits)
  if (!validatePhone(phone)) {
    errors.push('Invalid phone number (Indian format required)');
  }

  // Password validation
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special character (!@#$%^&*)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

module.exports = { 
  validateEmail, 
  validatePassword, 
  validatePhone, 
  validateRegister 
};