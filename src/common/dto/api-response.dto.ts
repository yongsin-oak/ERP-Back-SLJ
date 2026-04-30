import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from './paginated.dto';

export class ApiResponseDto<T> {
  @ApiProperty() success: boolean;
  @ApiProperty() statusCode: number;
  @ApiProperty() message: string;
  @ApiProperty() data: T;
}

export class ApiPaginatedResponseDto<T> {
  @ApiProperty() success: boolean;
  @ApiProperty() statusCode: number;
  @ApiProperty() message: string;
  @ApiProperty({ isArray: true }) data: T[];
  @ApiProperty({ type: () => PaginationDto }) pagination: PaginationDto;
}

export class ApiErrorResponseDto {
  @ApiProperty() success: false;
  @ApiProperty() statusCode: number;
  @ApiProperty() message: string | string[];
  @ApiProperty() error: string;
  @ApiProperty() timestamp: string;
  @ApiProperty() path: string;
}
