// product/dto/create-product.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Dimensions, ProductUnitPrice } from '../entities/product.interface';

export class ProductCreateDto {
  @ApiProperty({ example: 'P001', description: 'Product barcode' })
  @IsNotEmpty({ message: 'Barcode is required' })
  @IsString({ message: 'Barcode must be a string' })
  barcode: string;

  @ApiProperty({ example: 'น้ำดื่ม 500ml' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @ApiProperty({ example: 'SKU-001', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  brandId?: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false, description: 'ชื่อแบรนด์ (import) — ถ้าไม่มีในระบบจะสร้างให้อัตโนมัติ' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiProperty({ required: false, description: 'ชื่อหมวดหมู่ (import) — ถ้าไม่มีในระบบจะสร้างให้อัตโนมัติ' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiProperty({ example: 500, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number;

  @ApiProperty({
    example: {
      pack: 10,
      carton: 100,
    },
    required: false,
    description: 'Cost price in the format { pack: number, carton: number }',
  })
  @IsOptional()
  costPrice?: ProductUnitPrice;

  @ApiProperty({
    example: {
      pack: 15,
      carton: 150,
    },
    required: false,
    description: 'Sell price in the format { pack: number, carton: number }',
  })
  @IsOptional()
  sellPrice?: ProductUnitPrice;

  @ApiProperty({ example: 100 })
  @IsNotEmpty({ message: 'Remaining stock is required' })
  @IsInt()
  @Min(0)
  remaining: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiProperty()
  minStock?: number;

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
  @ApiProperty({
    example: {
      length: 10,
      width: 5,
      height: 2,
      weight: 1,
    },
    required: false,
  })
  @IsOptional()
  productDimensions: Dimensions;

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
  cartonDimensions: Dimensions;

  @ApiProperty({ example: 24, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  piecesPerPack?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  packPerCarton?: number;
}
