import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '../constants/error-code.enum';
import { PaginationDto, ResponseMetaDto } from './paginated.dto';

export class ApiResponseDto<T> {
  @ApiProperty() success: boolean;
  @ApiProperty() statusCode: number;
  @ApiProperty() message: string;
  @ApiProperty() data: T;
  @ApiProperty({ type: () => ResponseMetaDto }) meta: ResponseMetaDto;
}

export class ApiPaginatedResponseDto<T> {
  @ApiProperty() success: boolean;
  @ApiProperty() statusCode: number;
  @ApiProperty() message: string;
  @ApiProperty({ isArray: true }) data: T[];
  @ApiProperty({ type: () => PaginationDto }) pagination: PaginationDto;
  @ApiPropertyOptional({
    description: 'Aggregate data for the full result set. Shape varies per endpoint.',
    example: { totalRevenue: 150000 },
  })
  summary?: Record<string, unknown>;
  @ApiProperty({ type: () => ResponseMetaDto }) meta: ResponseMetaDto;
}

export class ApiErrorResponseDto {
  @ApiProperty() success: false;
  @ApiProperty() statusCode: number;
  @ApiProperty() message: string | string[];
  @ApiProperty({ description: 'HTTP label — "Unauthorized", "Conflict", "Not Found", ...' })
  error: string;
  @ApiPropertyOptional({
    enum: ErrorCode,
    description:
      'Machine-readable code. Present only on errors the client must branch on — ' +
      'distinct from `error`, which is the HTTP label.',
  })
  code?: ErrorCode;
  @ApiProperty() timestamp: string;
  @ApiProperty() path: string;
}
