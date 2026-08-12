import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { containsThai } from '../helpers/validation.helper';
import { maskSensitive } from '../helpers/mask-sensitive.helper';

function maskBody(body: Record<string, unknown>): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  return maskSensitive(body);
}

/**
 * Friendly Thai fallback per HTTP status. Used when an exception carries a
 * non-Thai (framework/library default) message — e.g. passport's "Unauthorized",
 * a route 404 "Cannot GET ...", malformed-JSON 400 — so the user never sees a
 * technical English string. Specific Thai messages thrown by our services
 * (which contain Thai characters) are preserved as-is.
 */
const STATUS_THAI_MESSAGE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่อีกครั้ง',
  [HttpStatus.UNAUTHORIZED]: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
  [HttpStatus.FORBIDDEN]: 'คุณไม่มีสิทธิ์ดำเนินการนี้',
  [HttpStatus.NOT_FOUND]: 'ไม่พบข้อมูลที่ต้องการ',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'ไม่รองรับการดำเนินการนี้',
  [HttpStatus.CONFLICT]: 'ข้อมูลนี้มีอยู่ในระบบแล้ว',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'ข้อมูลที่ส่งมีขนาดใหญ่เกินไป',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูล',
  [HttpStatus.TOO_MANY_REQUESTS]: 'มีการเรียกใช้งานบ่อยเกินไป กรุณาลองใหม่ภายหลัง',
};

const SERVER_ERROR_THAI = 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง';

/**
 * `error` is the HTTP label ("Unauthorized", "Not Found") per standard-api-responses.
 * Exceptions thrown with no message — passport's bare `new UnauthorizedException()`
 * behind JwtAuthGuard, for one — carry no `error` key, so we derive it here.
 * `HttpStatus[status]` alone yields the enum name ("UNAUTHORIZED"), which would make
 * the same status return two different labels depending on who threw it.
 */
function toErrorLabel(statusCode: number): string {
  const enumName = HttpStatus[statusCode];
  if (!enumName) return 'Error';
  return enumName
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { statusCode, message, error, code } = this.resolveException(exception, req);

    const body = {
      success: false,
      statusCode,
      message: this.toUserMessage(statusCode, message),
      error,
      // Present only when the thrower tagged an ErrorCode — errors the client must
      // branch on. Optional by design so the existing contract stays unchanged.
      ...(code ? { code } : {}),
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

  /**
   * Guarantees the user-facing `message` is always Thai. Array messages come from
   * the validation pipe (already Thai) and pass through. A 5xx is always the
   * generic Thai message — internals are logged, never leaked. A string message
   * with no Thai characters is a framework/library default → replaced with the
   * Thai per-status fallback.
   */
  private toUserMessage(statusCode: number, message: string | string[]): string | string[] {
    if (Array.isArray(message)) return message;
    if (statusCode >= 500) return SERVER_ERROR_THAI;
    if (containsThai(message)) return message;
    return STATUS_THAI_MESSAGE[statusCode] ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  }

  private resolveException(
    exception: unknown,
    req: Request,
  ): {
    statusCode: number;
    message: string | string[];
    error: string;
    code?: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && 'message' in response
          ? (response as any).message
          : exception.message;
      const thrownError =
        typeof response === 'object' && 'error' in response
          ? (response as any).error
          : undefined;
      const error =
        typeof thrownError === 'string' && thrownError.length > 0
          ? thrownError
          : toErrorLabel(status);
      const code =
        typeof response === 'object' && 'code' in response
          ? (response as any).code
          : undefined;
      return { statusCode: status, message, error, code };
    }

    if (exception instanceof QueryFailedError) {
      return this.resolveDbError(exception, req);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: SERVER_ERROR_THAI,
      error: 'Internal Server Error',
    };
  }

  /**
   * Map raw Postgres errors to friendly Thai. The user message is intentionally
   * generic (a DB error usually means a missed validation upstream); the real
   * pg code/detail/query is logged so engineers can still debug.
   */
  private resolveDbError(
    exception: QueryFailedError,
    req: Request,
  ): { statusCode: number; message: string; error: string } {
    const pg = exception as any;
    (req as any).log?.error({
      err: exception,
      pgCode: pg.code,
      pgDetail: pg.detail,
      query: pg.query,
      reqBody: maskBody(req.body),
    });

    switch (pg.code) {
      case '23505': // unique_violation
        return { statusCode: HttpStatus.CONFLICT, message: 'ข้อมูลนี้มีอยู่ในระบบแล้ว', error: 'Conflict' };
      case '23503': // foreign_key_violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'ข้อมูลที่เลือกไม่ถูกต้องหรือถูกใช้งานอยู่ ไม่สามารถดำเนินการได้',
          error: 'Bad Request',
        };
      case '23502': // not_null_violation
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'กรุณากรอกข้อมูลให้ครบถ้วน', error: 'Bad Request' };
      case '23514': // check_violation
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'ข้อมูลไม่ผ่านเงื่อนไขที่กำหนด', error: 'Bad Request' };
      case '22P02': // invalid_text_representation (bad enum/uuid/number)
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'รูปแบบข้อมูลไม่ถูกต้อง', error: 'Bad Request' };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: SERVER_ERROR_THAI,
          error: 'Internal Server Error',
        };
    }
  }
}
