import { Employee } from '@app/modules/employee/entities/employee.entity';
import { Terminal } from '@app/modules/terminal/terminal.entity';
import { OrderDetail } from '@app/modules/order-detail/entities/orderDetail.entity';
import { Shop } from '@app/modules/shop/entities/shop.entity';
import { OrderStatus } from '@app/modules/order/entities/order.entity';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class OrderResponseDto {
  @ApiProperty({ description: 'Unique identifier for the order', example: 'ORD-20260506-xxxx' })
  id: string;

  @ApiProperty()
  recordBy: Employee;

  @ApiProperty()
  terminal: Terminal;

  @ApiProperty()
  shop: Shop;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  startRecordAt: Date | null;

  @ApiProperty()
  completedRecordAt: Date | null;

  @ApiProperty()
  note: string | null;

  @ApiProperty({ description: 'เลขคำสั่งซื้อจากแพลตฟอร์ม' })
  orderNumber: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({
    description: 'Details of the order items',
    type: 'array',
    items: { type: 'object', $ref: getSchemaPath(OrderDetail) },
  })
  orderDetails: OrderDetail[];
}

export class OrderIsExistsResponseDto {
  @ApiProperty({ description: 'Indicates whether the order exists', example: true })
  exists: boolean;
}
