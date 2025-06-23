import { Product } from '@app/modules/product/entities/product.entity';
import { ApiProperty } from '@nestjs/swagger';

export class OrderDetailResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the order detail',
    example: 'ORD-DETAIL-20250608235923-TEST-001',
  })
  id: string;

  @ApiProperty()
  product: Product;

  @ApiProperty({
    description: 'Order ID associated with the order detail',
    example: 'ORD-20250608235923-TEST',
  })
  orderId: string;

  @ApiProperty({
    description: 'Quantity of the product in the order detail',
    example: 2,
  })
  quantityPack: number;

  @ApiProperty({
    description: 'Quantity of the product in the order detail',
    example: 2,
  })
  quantityCarton: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
