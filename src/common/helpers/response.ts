import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaginatedResponseDto, PaginationDto } from '../dto/paginated.dto';

// ---------------------------------------------------------------------------
// Success
// ---------------------------------------------------------------------------

/**
 * Pass-through helper — TransformResponseInterceptor wraps the value automatically.
 * Usage: return ok(entity);
 */
export function ok<T>(data: T): T {
  return data;
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  summary?: Record<string, unknown>,
): PaginatedResponseDto<T> {
  const totalPages = Math.ceil(total / limit);
  const pagination: PaginationDto = {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
  return summary !== undefined ? { data, pagination, summary } : { data, pagination };
}

/** @deprecated use paginatedResponse */
export const formattedResponsePaginated = paginatedResponse;

// ---------------------------------------------------------------------------
// Errors — return exception instances, caller throws them
// Usage: throw notFound(`Product ${barcode} not found`);
// ---------------------------------------------------------------------------

export const badRequest = (message: string) =>
  new BadRequestException(message);

export const unauthorized = (message = 'Unauthorized') =>
  new UnauthorizedException(message);

export const forbidden = (message = 'Forbidden') =>
  new ForbiddenException(message);

export const notFound = (message: string) =>
  new NotFoundException(message);

export const conflict = (message: string) =>
  new ConflictException(message);

export const unprocessable = (message: string) =>
  new UnprocessableEntityException(message);

export const internalError = (message = 'Internal server error') =>
  new InternalServerErrorException(message);
