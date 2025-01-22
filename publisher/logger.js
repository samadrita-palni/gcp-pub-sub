const winston = require("winston");
const { LoggingWinston } = require("@google-cloud/logging-winston");
const logging = require("@google-cloud/logging");

// Logger constructor function
function Logger(options = {}) {
  const transports = [
    // Log to the console
    new winston.transports.Console({ format: winston.format.simple() }),
  ];

  // If running on GCP, add Google Cloud Logging transport
  if (process.env.NODE_ENV !== "local") {
    const logClient = new logging.Logging(); // Google Cloud Logging client
    const googleCloudLoggingTransport = new LoggingWinston({
      logName: options.logName || 'publisher-events', // Customize the log name (optional)
    });

    transports.push(googleCloudLoggingTransport); // Add the Google Cloud Logging transport
  }

  // Create the Winston logger instance
  const logger = winston.createLogger({
    level: 'info', // Default logging level
    format: winston.format.json(),
    transports: transports,
  });

  return logger;
}

// Export the constructor
module.exports = Logger;
