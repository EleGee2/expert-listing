import { randomUUID } from 'node:crypto';

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { RequestWithId } from '../types/request-with-id';

type ExceptionBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = typeof exceptionResponse === 'object' ? (exceptionResponse as ExceptionBody) : undefined;
    const requestId = request.id ?? randomUUID();

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message: body?.message ?? (status === 500 ? 'Internal server error' : exceptionResponse),
        code: body?.error ?? HttpStatus[status] ?? 'Error',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
    });
  }
}
