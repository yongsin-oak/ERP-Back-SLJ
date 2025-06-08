import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional } from 'class-validator';
import { OrderDetailCreateDto } from 'src/modules/order-detail/dto/create-order-detail.dto';

export class OrderCreateDto {
  @ApiProperty({
    description: 'ID of the employee handling the order',
    example: 1,
  })
  @IsNotEmpty({ message: 'Employee ID is required' })
  employeeId: number;

  @ApiProperty({
    description: 'ID of the shop where the order is placed',
    example: 1,
  })
  @IsNotEmpty({ message: 'Shop ID is required' })
  shopId: number;

  @ApiProperty({
    description: 'Details of the order items',
    type: [OrderDetailCreateDto],
    required: false,
  })
  @IsArray({
    message: 'Order details must be an array',
  })
  @IsNotEmpty({
    message: 'Order details cannot be empty',
  })
  orderDetails?: OrderDetailCreateDto[];
}
