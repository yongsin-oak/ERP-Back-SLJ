import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class OrderDetailCreateDto {
  @ApiProperty({ description: 'product barcode' })
  @IsNotEmpty()
  @IsString()
  productBarcode: string;

  @ApiProperty({ required: false, type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityPack?: number;

  @ApiProperty({ required: false, type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityCarton?: number;
}
