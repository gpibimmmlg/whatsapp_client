const winston = require('winston');
require('winston-daily-rotate-file');
const { combine, timestamp, json, errors } = winston.format;

const fileRotateTransportError = new winston.transports.DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '7d',
  level: 'error',
});

const fileRotateTransportCombined = new winston.transports.DailyRotateFile({
  filename: 'logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '7d',
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({
      format: 'YYYY-MM-DD hh:mm:ss.SSS A',
    }),
    json()
  ),
  transports: [fileRotateTransportCombined, fileRotateTransportError],
});

module.exports = logger;
