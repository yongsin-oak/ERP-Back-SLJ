import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProductDropdownSearchDto {
  @ApiProperty({ description: 'ค้นหาจาก name หรือ barcode', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ProductDropdownItemDto {
  @ApiProperty()
  barcode: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  remaining: number;

  @ApiProperty()
  sellPrice: { pack: number; carton: number };
}
