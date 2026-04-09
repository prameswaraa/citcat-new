import winston from 'winston'

import { sanitizeLogValue, serializeLogMeta } from './logger-serializer.js'

const { combine, timestamp, errors, printf, colorize } = winston.format
const sanitizeFormat = winston.format((info) => sanitizeLogValue(info) as winston.Logform.TransformableInfo)

// Custom format for console output - include all metadata
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  // Remove service from meta as it's redundant
  const { service, ...restMeta } = meta
  const metaStr = Object.keys(restMeta).length > 0 
    ? '\n' + serializeLogMeta(restMeta) 
    : ''
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`
})

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    sanitizeFormat(),
    timestamp(),
    errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'metawa-backend'
  },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
})

// If we're not in production then log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    )
  }))
}

// Create logs directory if it doesn't exist
import fs from 'fs'
import path from 'path'

const logsDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}
