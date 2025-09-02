import { OrderDetailCreateDto } from '@app/modules/order-detail/dto/create-order-detail.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class OrderCreateDto {
  @ApiProperty({
    description: 'Unique identifier for the order',
    example: 'TH123456789',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'ID of the employee handling the order',
    example: 1,
  })
  @IsNotEmpty({ message: 'Employee ID is required' })
  employeeId: string;

  @ApiProperty({
    description: 'ID of the shop where the order is placed',
    example: 1,
  })
  @IsNotEmpty({ message: 'Shop ID is required' })
  shopId: string;

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
