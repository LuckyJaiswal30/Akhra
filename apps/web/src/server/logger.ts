import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const level = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');
const prettyPrint = !isProduction && !isTest && level !== 'silent';

export const logger = pino({
  level,
  base: { service: 'akhra' },
  redact: {
    paths: [
      'password',
      'token',
      '*.password',
      '*.token',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[redacted]',
  },
  ...(prettyPrint
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }
    : {}),
});
