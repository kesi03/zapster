import winston from 'winston';
import * as path from 'node:path';

const logLevel = process.env.DEBUG === 'true' ? 'debug' : 'info';

let logFilePath: string = 'debug.log';
let fileTransport: winston.transport | null = null;

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message}`;
  })
);

export const logger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.File({ 
      filename: logFilePath, 
      level: 'debug',
      format: logFormat,
      options: { flags: 'a' }
    }),
    new winston.transports.Console({
      format: logFormat
    })
  ],
});

export function setLogFilePath(outputPath: string): void {
  const dir = path.dirname(outputPath);
  logFilePath = path.join(dir, 'zapster.log');
  
  if (fileTransport) {
    logger.remove(fileTransport);
  }
  
  fileTransport = new winston.transports.File({
    filename: logFilePath,
    level: 'debug',
    format: logFormat,
    options: { flags: 'a' }
  });
  
  logger.add(fileTransport);
}

export function setDebug(enabled: boolean): void {
  logger.level = enabled ? 'debug' : 'info';
}

export const log = {
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, ...args: any[]) => logger.error(message, ...args),
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  success: (message: string, ...args: any[]) => logger.info(`✓ ${message}`, ...args),
};
