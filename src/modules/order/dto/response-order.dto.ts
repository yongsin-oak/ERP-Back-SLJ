import { Employee } from '@app/modules/employee/entities/employee.entity';
import { OrderDetail } from '@app/modules/order-detail/entities/orderDetail.entity';
import { Shop } from '@app/modules/shop/entities/shop.entity';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

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
