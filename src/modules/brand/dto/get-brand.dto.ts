import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BrandGetDto extends PaginatedGetAllDto {
  @ApiPropertyOptional({ description: 'Search by brand name' })
  @IsOptional()
  @IsString()
  search?: string;
}
