import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContext } from '../common/request-context';
import { safeLog } from '../logging/logger';
import { mapPrismaError } from './prisma-error.mapper';

const SENSITIVE_PATHS = ['/auth/login', '/auth/reset-password', '/auth/refresh'];

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = RequestContext.getStore()?.requestId;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    if (exception instanceof HttpException) {
      const raw = exception.getResponse();
      message = (raw as { message?: string })?.message ?? exception.message;
    }

    const maybePrisma = mapPrismaError(exception as { code?: string; message?: string });
    if (maybePrisma) {
      message = maybePrisma;
    }

    const lowered = message.toLowerCase();
    if (lowered.includes('unique constraint') || lowered.includes('violat')) {
      message = lowered.includes('email') ? 'Email already in use' : 'Request could not be completed';
    }

    if (SENSITIVE_PATHS.some((path) => request.path.startsWith(path))) {
      message = status >= 500 ? 'Request failed' : 'Invalid request';
    }

    safeLog('error', 'Unhandled exception', {
      error: {
        message: (exception as Error)?.message,
        stack: (exception as Error)?.stack,
        code: (exception as { code?: string })?.code,
      },
      path: request.path,
      method: request.method,
      requestId,
    });

    const exposeMessage = process.env.NODE_ENV === 'production' ? message : message;

    response.status(status).json({
      statusCode: status,
      message: exposeMessage,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
