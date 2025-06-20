import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Employee } from 'src/modules/employee/entities/employee.entity';
import { OrderDetail } from 'src/modules/order-detail/entities/orderDetail.entity';
import { Shop } from 'src/modules/shop/entities/shop.entity';

export class OrderResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the order',
    example: 'ORD-20250608235923-TEST',
  })
  id: string;

  @ApiProperty()
  employee: Employee;

  @ApiProperty()
  shop: Shop;

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
