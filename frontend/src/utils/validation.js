export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required';
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  passwordStrength: (value) => {
    if (!value) return null;
    const checks = {
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    };
    const score = Object.values(checks).filter(Boolean).length;
    if (score < 3) {
      return 'Password is too weak. Include uppercase, lowercase, numbers, and special characters.';
    }
    return null;
  },

  match: (otherValue, fieldName = 'Password') => (value) => {
    if (!value) return null;
    if (value !== otherValue) {
      return `${fieldName}s do not match`;
    }
    return null;
  },
};

export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const levels = [
    { label: 'Very Weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-yellow-500' },
    { label: 'Good', color: 'bg-blue-500' },
    { label: 'Strong', color: 'bg-green-500' },
  ];
  return { score, ...(levels[score - 1] || { label: '', color: '' }) };
};

export const validateForm = (data, rules) => {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      const error = rule(data[field]);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }
  return { isValid: Object.keys(errors).length === 0, errors };
};
