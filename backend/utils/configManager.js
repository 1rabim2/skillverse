/**
 * Environment variable validation and configuration management
 * Validates all required environment variables on startup
 */

const requiredEnvVars = [
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NODE_ENV'
];

const optionalEnvVars = [
  'GOOGLE_CALLBACK_URL',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'KHALTI_SECRET',
  'UPLOAD_DIR',
  'MAX_UPLOAD_SIZE_MB',
  'CORS_ORIGIN',
  'REDIS_URL',
  'SESSION_SECRET'
];

/**
 * Validate all required environment variables
 * @throws Error if any required variable is missing
 */
function validateEnvironment() {
  console.log('Validating environment variables...');
  
  const missing = [];
  const invalid = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Validate format of specific variables
  if (process.env.PORT && isNaN(process.env.PORT)) {
    invalid.push(`PORT: "${process.env.PORT}" is not a valid number`);
  }

  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    invalid.push(`NODE_ENV: "${process.env.NODE_ENV}" must be one of: development, production, test`);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    invalid.push('JWT_SECRET: Must be at least 32 characters for security');
  }

  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('mongodb')) {
    invalid.push('MONGODB_URI: Does not appear to be a valid MongoDB connection string');
  }

  if (process.env.MAX_UPLOAD_SIZE_MB && isNaN(process.env.MAX_UPLOAD_SIZE_MB)) {
    invalid.push(`MAX_UPLOAD_SIZE_MB: "${process.env.MAX_UPLOAD_SIZE_MB}" is not a valid number`);
  }

  // Report errors
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
  }

  if (invalid.length > 0) {
    console.error('\n❌ Invalid environment variable values:');
    invalid.forEach(msg => console.error(`  - ${msg}`));
  }

  if (missing.length > 0 || invalid.length > 0) {
    throw new Error(`Environment validation failed. Fix ${missing.length} missing and ${invalid.length} invalid variables.`);
  }

  console.log('✅ Environment variables validated successfully\n');
}

/**
 * Get environment configuration object
 */
function getConfig() {
  return {
    // Server
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // Database
    mongodbUri: process.env.MONGODB_URI,

    // Authentication
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '7d',

    // Google OAuth
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',

    // Email
    emailUser: process.env.EMAIL_USER,
    emailPassword: process.env.EMAIL_PASSWORD,
    emailFrom: process.env.EMAIL_FROM || 'noreply@skillverse.com',

    // Payment
    khaltiSecret: process.env.KHALTI_SECRET,

    // File Upload
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxUploadSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50'),

    // CORS
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

    // Redis (optional)
    redisUrl: process.env.REDIS_URL,

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',

    // API
    apiPrefix: '/api',
    apiVersion: 'v1'
  };
}

/**
 * Log configuration (without sensitive data)
 */
function logConfig(config) {
  console.log('\n📋 Current Configuration:');
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Database: ${config.mongodbUri.replace(/:[^:]*@/, ':****@')}`);
  console.log(`  Upload Dir: ${config.uploadDir}`);
  console.log(`  Max Upload Size: ${config.maxUploadSizeMB}MB`);
  console.log(`  CORS Origin: ${config.corsOrigin}`);
  console.log(`  JWT Expiry: ${config.jwtExpiry}`);
  console.log('');
}

module.exports = {
  validateEnvironment,
  getConfig,
  logConfig,
  requiredEnvVars,
  optionalEnvVars
};
