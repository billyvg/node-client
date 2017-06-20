const crypto = require('crypto');

const winston = require('winston');
const SentryTransport = require('the-best-winston-sentry');

const version = require('../package').version;

let logger;

winston.level = process.env.NVIM_NODE_LOG_LEVEL || 'debug';

if (process.env.NVIM_NODE_LOG_FILE) {
  logger = new winston.Logger({
    transports: [
      new winston.transports.File({
        filename: process.env.NVIM_NODE_LOG_FILE,
        level: winston.level,
        json: false,
      }),
    ],
  });
} else {
  if (!process.env.ALLOW_CONSOLE) {
    // Remove Console transport
    winston.remove(winston.transports.Console);
  }
  logger = winston;
}

// Add Sentry transport
const id = crypto.randomBytes(16).toString('hex');
const shouldUseSentry = process.env.NODE_ENV !== 'test' && !process.env.CI;

logger.add(SentryTransport, {
  dsn:
    shouldUseSentry &&
      'https://fefc9a2f01d94b7cac1be0924fe5d7f6:7412155de68044f7856384e9677f6271@sentry.io/181845',
  level: 'info',
  disableConsoleAlerts: true,
  // patchGlobal: true,
  // captureUnhandledRejections: true,
  release: version,
  breadcrumbLevel: 'warn',
  dataCallback: data =>
    Object.assign({}, data, {
      server_name: null,
      user: {
        ip_address: null,
        server_name: null,
        id,
      },
    }),
});

module.exports = logger;
// module.exports.default = module.exports;
