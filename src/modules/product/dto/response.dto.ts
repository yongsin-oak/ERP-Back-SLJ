import { ApiProperty } from '@nestjs/swagger';
export class ProductResponseDto {
  @ApiProperty()
  barcode: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  brandName: string;

  @ApiProperty()
  categoryName: string;

  @ApiProperty()
  costPrice: number;

  @ApiProperty()
  currentPrice: number;

  @ApiProperty()
  remaining: number;

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
  productDimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };

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
