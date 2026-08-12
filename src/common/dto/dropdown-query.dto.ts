import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Rows per dropdown page when the client does not ask for a specific size. */
export const DROPDOWN_DEFAULT_LIMIT = 20;
/** Hard ceiling — a dropdown is scrolled, not bulk-loaded. */
export const DROPDOWN_MAX_LIMIT = 50;

/**
 * Base query DTO for all dropdown / infinite-scroll endpoints.
 *
 * Cursor-based on purpose — see `DropdownResponseDto` for why dropdowns do not
 * share the offset contract of table lists. There is no `page` here, and adding
 * one back would reintroduce the skipped/duplicated rows this replaced.
 */
export class DropdownQueryDto {
  @ApiPropertyOptional({
    description: 'Opaque cursor from the previous page’s `nextCursor`. Omit for the first page.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    example: DROPDOWN_DEFAULT_LIMIT,
    description: `Items per page — max ${DROPDOWN_MAX_LIMIT} (default ${DROPDOWN_DEFAULT_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DROPDOWN_MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;
}
