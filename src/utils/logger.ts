import winston from 'winston';

const logLevel = process.env.DEBUG === 'true' ? 'debug' : 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'debug.log', 
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          return `[${timestamp}] ${level.toUpperCase()}: ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`;
        })
      )
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

export function setDebug(enabled: boolean): void {
  logger.level = enabled ? 'debug' : 'info';
}
