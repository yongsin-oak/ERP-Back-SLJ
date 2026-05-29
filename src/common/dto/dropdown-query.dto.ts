import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Base query DTO for all dropdown / infinite-scroll endpoints.
 * page and limit are optional — defaults are applied in service layer.
 */
export class DropdownQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (default 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Items per page — max 50 (default 20)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;
}
