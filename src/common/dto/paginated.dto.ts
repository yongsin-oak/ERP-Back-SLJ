import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Base query for paginated list endpoints where page/limit are optional and
 * defaulted in the service (used by admin lists that fetch a large page at once).
 * Extend it to add filters; reuse instead of redefining page/limit/search.
 */
export class PaginatedListQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (default 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Items per page — max 200 (default 20)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PaginatedGetAllDto {
  @ApiProperty({ example: 1, description: 'Page number' })
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer.' })
  @Min(1, { message: 'Page must be at least 1.' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  limit: number;
}

export class PaginationDto {
  @ApiProperty({ example: 1, description: 'Page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ example: 100, description: 'Total number of items' })
  total: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPreviousPage: boolean;

  @ApiProperty({ example: 10, description: 'Total number of pages' })
  totalPages: number;
}

/** Infrastructure metadata injected by TransformResponseInterceptor on every success response. */
export class ResponseMetaDto {
  @ApiProperty({ description: 'UUID v4 — correlates this response to server logs' })
  requestId: string;

  @ApiProperty({ description: 'Server time when the response was generated (ISO 8601)' })
  timestamp: string;
}

export class PaginatedResponseDto<T> {
  @IsArray()
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 100,
      hasNextPage: true,
      hasPreviousPage: false,
      totalPages: 10,
    },
    description: 'Pagination metadata',
  })
  @Type(() => PaginationDto)
  pagination: PaginationDto;

  /** Endpoint-specific aggregates over the full result set (not just this page). */
  @ApiPropertyOptional({
    description: 'Aggregate/summary data for the whole result set. Shape varies per endpoint.',
    example: { totalRevenue: 150000, totalQuantityIn: 800 },
  })
  summary?: Record<string, unknown>;
}
