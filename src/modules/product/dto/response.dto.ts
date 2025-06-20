import { ApiProperty } from '@nestjs/swagger';
import { Dimensions, ProductUnitPrice } from '../entities/product.interface';
import { Brand } from 'src/modules/brand/entities/brand.entity';
import { Category } from 'src/modules/category/entities/category.entity';
export class ProductResponseDto {
  @ApiProperty()
  barcode: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  brand: Brand;

  @ApiProperty()
  category: Category;

  @ApiProperty()
  costPrice: ProductUnitPrice;

  @ApiProperty()
  sellPrice: ProductUnitPrice;

  @ApiProperty()
  remaining: number;

  @ApiProperty()
  minStock?: number;

  @ApiProperty({
    example: {
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
    },
    required: false,
    description: 'Product dimensions in cm and weight in kg',
  })
  productDimensions: Dimensions;

  @ApiProperty({
    example: {
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
    },
    required: false,
    description: 'Carton dimensions in cm and weight in kg',
  })
  cartonDimensions: Dimensions;

  @ApiProperty()
  piecesPerPack: number;

  @ApiProperty()
  packPerCarton: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
