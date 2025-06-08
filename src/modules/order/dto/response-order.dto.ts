import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { OrderDetail } from 'src/modules/order-detail/entities/orderDetail.entity';

export class OrderResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the order',
    example: 'ORD-20250608235923-TEST',
  })
  id: string;

  @ApiProperty({
    description: 'Total cost price of the order',
    required: false,
  })
  totalCostPrice: number;

  @ApiProperty({
    description: 'Total current price of the order',
    required: false,
  })
  totalCurrentPrice: number;

  @ApiProperty({
    description: 'Total quantity of items in the order',
  })
  totalQuantity: number;

  @ApiProperty({
    description: 'Total cost price of the order',
  })
  employeeId: number;

  @ApiProperty({
    description: 'Total current price of the order',
  })
  shopId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({
    description: 'Details of the order items',
    type: 'array',
    items: {
      type: 'object',
      $ref: getSchemaPath(OrderDetail),
    },
  })
  orderDetails: OrderDetail[];
}
