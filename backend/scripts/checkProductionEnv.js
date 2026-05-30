const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const required = [
  'NODE_ENV',
  'MONGO_URI',
  'JWT_SECRET',
  'FRONTEND_URL',
  'BASE_URL',
  'GOOGLE_CLIENT_ID'
];

const recommended = [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'KHALTI_SECRET_KEY',
  'KHALTI_MONTHLY_AMOUNT'
];

const placeholderPatterns = [
  /^replace/i,
  /^your_/i,
  /replace_me/i,
  /example\.com/i,
  /localhost/i,
  /admin12345/i,
  /dev_secret/i,
  /^test_secret_key/i
];

function valueOf(key) {
  return String(process.env[key] || '').trim();
}

function isPlaceholder(value) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

const errors = [];
const warnings = [];

for (const key of required) {
  const value = valueOf(key);
  if (!value) errors.push(`${key} is required.`);
  else if (isPlaceholder(value)) errors.push(`${key} still looks like a development or placeholder value.`);
}

for (const key of recommended) {
  const value = valueOf(key);
  if (!value) warnings.push(`${key} is not set.`);
  else if (isPlaceholder(value)) warnings.push(`${key} still looks like a development or placeholder value.`);
}

if (valueOf('NODE_ENV') && valueOf('NODE_ENV') !== 'production') {
  errors.push('NODE_ENV must be "production" for production deployment.');
}

if (valueOf('JWT_SECRET') && valueOf('JWT_SECRET').length < 32) {
  errors.push('JWT_SECRET must be at least 32 characters.');
}

if (valueOf('MONGO_URI') && !valueOf('MONGO_URI').startsWith('mongodb')) {
  errors.push('MONGO_URI must be a MongoDB connection string.');
}

for (const key of ['FRONTEND_URL', 'BASE_URL']) {
  const value = valueOf(key);
  if (value && !/^https:\/\//i.test(value)) {
    errors.push(`${key} should use https:// in production.`);
  }
}

if (!fs.existsSync(path.join(__dirname, '..', '.env'))) {
  errors.push('backend/.env was not found.');
}

if (warnings.length) {
  console.warn('Production env warnings:');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error('Production env check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Production env check passed.');
