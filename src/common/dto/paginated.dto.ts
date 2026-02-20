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
}
