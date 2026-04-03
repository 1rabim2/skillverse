const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const LOG_LEVEL_COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m'  // Gray
};
const RESET_COLOR = '\x1b[0m';

class Logger {
  constructor(name = 'skillverse') {
    this.name = name;
    this.logFile = path.join(logsDir, `${name}.log`);
    this.currentLevel = process.env.LOG_LEVEL || 'INFO';
  }

  format(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const context = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
    return `[${timestamp}] [${level}] [${this.name}] ${message} ${context}`.trim();
  }

  log(level, message, data) {
    const formatted = this.format(level, message, data);

    // Console output with colors in development
    if (process.env.NODE_ENV !== 'production') {
      const color = LOG_LEVEL_COLORS[level] || '';
      console.log(`${color}${formatted}${RESET_COLOR}`);
    } else {
      console.log(formatted);
    }

    // File output
    try {
      fs.appendFileSync(this.logFile, formatted + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  error(message, data) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message, data) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data) {
    if (this.currentLevel === 'DEBUG') {
      this.log(LOG_LEVELS.DEBUG, message, data);
    }
  }
}

module.exports = Logger;
