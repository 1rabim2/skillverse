/**
 * Backend initialization script
 * Call this on application startup to set up all utilities and validations
 */

const { validateEnvironment, getConfig, logConfig } = require('./utils/configManager');
const { createAllIndexes } = require('./utils/indexManager');

/**
 * Initialize backend services
 * Call this in your main index.js before starting the server
 */
async function initializeBackend(app) {
  console.log('\n🚀 SkillVerse Backend Initialization\n');
  console.log('='.repeat(50));

  try {
    // 1. Validate environment
    console.log('\n1️⃣  Validating Environment...');
    validateEnvironment();

    // 2. Load configuration
    console.log('2️⃣  Loading Configuration...');
    const config = getConfig();
    logConfig(config);
    
    // Store in app for access
    app.locals.config = config;

    // 3. Set up security headers
    console.log('3️⃣  Setting up Security Headers...');
    const helmet = require('helmet');
    app.use(helmet());
    console.log('✓ Helmet security headers enabled');

    // 4. Set up monitoring middleware
    console.log('4️⃣  Setting up Monitoring...');
    const { requestTimingMiddleware, requestLoggingMiddleware, healthCheckMiddleware } = require('./middleware/monitoring');
    app.use(healthCheckMiddleware);
    app.use(requestTimingMiddleware);
    app.use(requestLoggingMiddleware);
    console.log('✓ Monitoring middleware enabled');

    // 5. Create database indexes
    console.log('5️⃣  Creating Database Indexes...');
    await createAllIndexes();

    // 6. Warm up caches
    console.log('6️⃣  Initializing Caches...');
    const { CacheManager } = require('./utils/responseManager');
    app.locals.cache = new CacheManager();
    console.log('✓ Cache manager initialized');

    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Backend initialization complete!\n');

    return config;
  } catch (err) {
    console.error('\n❌ Backend initialization failed:');
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = {
  initializeBackend
};
