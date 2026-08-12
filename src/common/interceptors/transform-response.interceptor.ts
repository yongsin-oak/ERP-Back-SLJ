import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { map, Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorator/response-message.decorator';

const METHOD_MESSAGES: Record<string, string> = {
  GET: 'OK',
  POST: 'Created',
  PATCH: 'Updated',
  PUT: 'Updated',
  DELETE: 'Deleted',
};

function isPaginatedShape(
  value: unknown,
): value is { data: unknown[]; pagination: object; summary?: Record<string, unknown> } {
  return (
    value !== null &&
    typeof value === 'object' &&
    Array.isArray((value as any).data) &&
    typeof (value as any).pagination === 'object'
  );
}

/**
 * `DropdownResponseDto` — the cursor counterpart of `isPaginatedShape`.
 *
 * Both envelopes get the same treatment: `data` is hoisted to the top level and
 * its metadata sits beside it (`pagination` there, `nextCursor` here). Without
 * this branch the whole DTO falls through to the generic wrap and arrives as
 * `data: { data: [...], nextCursor }` — one level deeper than every other list
 * response, which breaks callers that map over `body.data`.
 */
function isCursorShape(value: unknown): value is { data: unknown[]; nextCursor: string | null } {
  if (value === null || typeof value !== 'object' || !Array.isArray((value as any).data)) return false;
  const cursor = (value as any).nextCursor;
  // `null` is a meaningful value here (list exhausted), so test the key, not truthiness.
  return 'nextCursor' in value && (cursor === null || typeof cursor === 'string');
}

function buildMeta() {
  return {
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (req.res?.headersSent) return next.handle();

    return next.handle().pipe(
      map((value) => {
        if (value === null || value === undefined) return value;

        const statusCode = res.statusCode;
        const customMessage = this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler());
        const message = customMessage ?? METHOD_MESSAGES[req.method] ?? 'OK';
        const meta = buildMeta();

        if (isPaginatedShape(value)) {
          const base = { success: true, statusCode, message, data: value.data, pagination: value.pagination, meta };
          return value.summary !== undefined ? { ...base, summary: value.summary } : base;
        }

        if (isCursorShape(value)) {
          return { success: true, statusCode, message, data: value.data, nextCursor: value.nextCursor, meta };
        }

        return { success: true, statusCode, message, data: value, meta };
      }),
    );
  }
}
