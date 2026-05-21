/**
 * Common backend utilities and helpers
 * Reduces code duplication across routes
 */

/**
 * Safely parse ObjectId
 */
function parseObjectId(id) {
  try {
    return require('mongoose').Types.ObjectId(id);
  } catch {
    return null;
  }
}

/**
 * Validate if string is valid ObjectId
 */
function isValidObjectId(id) {
  return require('mongoose').Types.ObjectId.isValid(id);
}

/**
 * Extract pagination params from query
 */
function getPaginationParams(query, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build MongoDB query filter
 */
function buildQueryFilter(filters) {
  const query = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(query, value);
    } else if (Array.isArray(value)) {
      query[key] = { $in: value };
    } else if (typeof value === 'string' && value.includes('*')) {
      // Wildcard search
      const regex = value.replace(/\*/g, '.*');
      query[key] = new RegExp(regex, 'i');
    } else {
      query[key] = value;
    }
  }

  return query;
}

/**
 * Build MongoDB sort options
 */
function buildSortOptions(sortBy) {
  if (!sortBy) return { createdAt: -1 };

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    alphabetical: { title: 1 },
    'alphabetical-desc': { title: -1 },
    popular: { enrollmentCount: -1 },
    'rating-high': { rating: -1 },
    'rating-low': { rating: 1 },
    'price-high': { price: -1 },
    'price-low': { price: 1 },
    'updated': { updatedAt: -1 }
  };

  return sortMap[sortBy] || { createdAt: -1 };
}

/**
 * Calculate progress percentage
 */
function calculateProgress(completedItems, totalItems) {
  if (totalItems === 0) return 0;
  return Math.round((completedItems / totalItems) * 100);
}

/**
 * Mask email for privacy
 */
function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  const masked = local.charAt(0) + '*'.repeat(Math.max(0, local.length - 2)) + local.charAt(local.length - 1);
  return `${masked}@${domain}`;
}

/**
 * Generate secure random token
 */
function generateToken(length = 32) {
  return require('crypto').randomBytes(length).toString('hex');
}

/**
 * Sleep utility for async operations
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Chunk array into smaller arrays
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Sanitize user input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .substring(0, 10000); // Limit length
}

/**
 * Deduplicate array by property
 */
function deduplicateArray(array, key) {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Format error message for response
 */
function formatErrorMessage(err) {
  if (err.message) return err.message;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

/**
 * Get URL from possible sources
 */
function getUrl(req) {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = req.get('host');
  return `${protocol}://${host}`;
}

module.exports = {
  parseObjectId,
  isValidObjectId,
  getPaginationParams,
  buildQueryFilter,
  buildSortOptions,
  calculateProgress,
  maskEmail,
  generateToken,
  sleep,
  retryWithBackoff,
  chunkArray,
  sanitizeInput,
  deduplicateArray,
  formatErrorMessage,
  getUrl
};
