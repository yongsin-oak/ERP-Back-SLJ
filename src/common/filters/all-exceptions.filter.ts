import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

const SENSITIVE_FIELDS = ['password', 'currentPassword', 'newPassword', 'currentPass', 'newPass'];

function maskBody(body: Record<string, unknown>): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const masked = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (field in masked) masked[field] = '[Redacted]';
  }
  return masked;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveException(exception);

    const body = {
      success: false,
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    if (statusCode >= 500) {
      (req as any).log?.error({
        err: exception,
        reqBody: maskBody(req.body),
        resBody: body,
      });
    }

    res.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && 'message' in response
          ? (response as any).message
          : exception.message;
      const error =
        typeof response === 'object' && 'error' in response
          ? (response as any).error
          : HttpStatus[status] ?? 'Error';
      return { statusCode: status, message, error };
    }

    if (exception instanceof QueryFailedError) {
      const pg = exception as any;
      if (pg.code === '23505') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Duplicate entry — record already exists',
          error: 'Conflict',
        };
      }
      if (pg.code === '23503') {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referenced record does not exist',
          error: 'Bad Request',
        };
      }
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database error',
        error: 'Internal Server Error',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }
}
