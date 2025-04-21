import { ApiProperty } from '@nestjs/swagger';
import { ProductGetAllDto as ProductGetAllDto } from './get-product.dto';
import { Product } from '../entities/product.entity';

export class ProductResponseDto {
  @ApiProperty()
  barcode: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  brand: string;

  @ApiProperty()
  categoryId: number;

  @ApiProperty()
  costPrice: number;

  @ApiProperty()
  currentPrice: number;

  @ApiProperty()
  remaining: number;

  @ApiProperty()
  productDimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };

  @ApiProperty()
  cartonDimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };

  @ApiProperty()
  piecesPerPack: number;

  @ApiProperty()
  packPerCarton: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
export class ProductResponseAllDto extends ProductGetAllDto {
  @ApiProperty({ example: 100, description: 'Total number of items' })
  total: number;
  
  @ApiProperty({ type: ProductResponseDto, isArray: true })
  data: ProductResponseDto[];
}
