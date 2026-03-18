import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  if (Object.keys(meta).length) log += ` ${JSON.stringify(meta)}`;
  return log;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
  }),
  new DailyRotateFile({
    filename: path.join(config.logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '30d',
    format: combine(timestamp(), errors({ stack: true }), logFormat),
  }),
  new DailyRotateFile({
    filename: path.join(config.logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    format: combine(timestamp(), errors({ stack: true }), logFormat),
  }),
];

export const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(timestamp(), errors({ stack: true })),
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(config.logDir, 'exceptions.log') }),
  ],
});
