import { ApiProperty } from '@nestjs/swagger';

export class PaginateResponseDto<T> {
  @ApiProperty({ type: [Object] })
  data: T[];

  @ApiProperty({ type: Number })
  page: number;

  @ApiProperty({ type: Number })
  limit: number;

  @ApiProperty({ type: Number })
  total: number;
}
export function paginate<T>(array: T[], page = 1, limit = 10) {
  const start = (page - 1) * limit;
  return {
    data: array.slice(start, start + limit),
    page,
    limit,
    total: array.length,
  };
}
