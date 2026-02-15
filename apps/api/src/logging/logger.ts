import pino from 'pino';
import { RequestContext } from '../common/request-context';
import { redactSensitiveData } from './redaction.util';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, singleLine: true },
      },
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  mixin: () => ({ requestId: RequestContext.getStore()?.requestId }),
});

export function safeLog(level: pino.Level, message: string, payload?: unknown) {
  const sanitized = payload ? redactSensitiveData(payload) : undefined;
  logger[level](sanitized as object, message);
}
