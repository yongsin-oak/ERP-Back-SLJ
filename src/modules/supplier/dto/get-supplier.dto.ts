import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SupplierGetDto extends PaginatedGetAllDto {
  @ApiPropertyOptional({ description: 'Search by supplier name' })
  @IsOptional()
  @IsString()
  search?: string;
}
