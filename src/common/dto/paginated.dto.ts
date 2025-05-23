import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Min } from 'class-validator';

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

export class PaginatedResponseDto<T> extends PaginatedGetAllDto {
  @IsArray()
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ example: 100, description: 'Total number of items' })
  total: number;
}
