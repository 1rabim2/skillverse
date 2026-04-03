// Password validation utility
function validatePassword(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*..etc)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = String(name).trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

function validateURL(url) {
  if (!url || typeof url !== 'string') return true; // URL is optional
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function sanitizeString(str, maxLength = 1000) {
  if (!str || typeof str !== 'string') return '';
  return String(str).trim().slice(0, maxLength);
}

function sanitizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateCoursTitle(title) {
  if (!title || typeof title !== 'string') return false;
  const trimmed = String(title).trim();
  return trimmed.length >= 3 && trimmed.length <= 200;
}

function validateQuizAnswers(answers, expectedLength) {
  if (!Array.isArray(answers)) return false;
  if (answers.length !== expectedLength) return false;
  return answers.every(a => Number.isFinite(Number(a)) && a >= 0);
}

// Middleware factory for request validation
function validateRequest(schema) {
  return (req, res, next) => {
    const errors = {};
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body?.[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors[field] = `${field} is required`;
        continue;
      }
      
      if (value !== undefined && value !== null && rules.type) {
        const actualType = typeof value;
        if (actualType !== rules.type) {
          errors[field] = `${field} must be ${rules.type}`;
        }
      }
      
      if (rules.minLength && String(value).length < rules.minLength) {
        errors[field] = `${field} must be at least ${rules.minLength} characters`;
      }
      
      if (rules.maxLength && String(value).length > rules.maxLength) {
        errors[field] = `${field} must not exceed ${rules.maxLength} characters`;
      }
      
      if (rules.pattern && !rules.pattern.test(String(value))) {
        errors[field] = rules.patternError || `${field} format is invalid`;
      }
      
      if (rules.validator && !rules.validator(value)) {
        errors[field] = rules.validatorError || `${field} is invalid`;
      }
    }
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    next();
  };
}

module.exports = {
  validatePassword,
  validateEmail,
  validateName,
  validateURL,
  sanitizeString,
  sanitizeEmail,
  validateCoursTitle,
  validateQuizAnswers,
  validateRequest
};
