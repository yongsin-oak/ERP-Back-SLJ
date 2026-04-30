import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

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
      this.logger.error(`${req.method} ${req.url}`, exception instanceof Error ? exception.stack : String(exception));
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
      // Unique constraint violation
      if (pg.code === '23505') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Duplicate entry — record already exists',
          error: 'Conflict',
        };
      }
      // Foreign key violation
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
