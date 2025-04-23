// product/dto/create-product.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Brand } from 'src/modules/brand/entities/brand.entity';

export class ProductCreateDto {
  @ApiProperty({ example: 'P001', description: 'Product barcode' })
  @IsNotEmpty({ message: 'Barcode is required' })
  @IsString({ message: 'Barcode must be a string' })
  barcode: string;

  @ApiProperty({ example: 'น้ำดื่ม 500ml' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  brandId?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiProperty({ example: 5.0, required: false })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiProperty({ example: 7.0, required: false })
  @IsOptional()
  @IsNumber()
  currentPrice?: number;

  @ApiProperty({ example: 100 })
  @IsNotEmpty({ message: 'Remaining is required' })
  @IsNumber()
  remaining: number;

  @ApiProperty({
    example: {
      length: 10,
      width: 5,
      height: 2,
      weight: 1,
    },
    required: false,
    description: 'Product dimensions in cm and weight in kg',
  })
  @IsOptional()
  productDimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };

  @ApiProperty({
    example: {
      length: 20,
      width: 15,
      height: 10,
      weight: 2,
    },
    required: false,
    description: 'Carton dimensions in cm and weight in kg',
  })
  @IsOptional()
  cartonDimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  @ApiProperty({ example: 24, required: false })
  @IsOptional()
  @IsNumber()
  piecesPerPack?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  packPerCarton?: number;
}
