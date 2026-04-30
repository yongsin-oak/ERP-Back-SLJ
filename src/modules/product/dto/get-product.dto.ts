import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProductGetDto extends PaginatedGetAllDto {
  @ApiProperty({ required: false, description: 'Search by name or barcode' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Filter by brand ID' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiProperty({ required: false, description: 'Filter by category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
