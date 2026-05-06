import { OrderDetailCreateDto } from '@app/modules/order-detail/dto/create-order-detail.dto';
import { OrderStatus } from '@app/modules/order/entities/order.entity';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OrderCreateDto {
  @ApiProperty({ description: 'Employee ID (ผู้บันทึก)', example: 'EMP-xxxx' })
  @IsString()
  @IsNotEmpty()
  recordBy: string;

  @ApiProperty({ description: 'Shop ID', example: 'SHOP-xxxx' })
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @ApiProperty({ description: 'Terminal ID (ถ้าสร้างผ่าน terminal)', example: 'TERM-xxxx', required: false })
  @IsOptional()
  @IsString()
  terminalId?: string;

  @ApiProperty({ description: 'สถานะ order', enum: OrderStatus, required: false })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ description: 'เวลาเริ่มบันทึก order', required: false })
  @IsOptional()
  @IsDateString()
  startRecordAt?: string;

  @ApiProperty({ description: 'เวลาบันทึก order เสร็จ', required: false })
  @IsOptional()
  @IsDateString()
  completedRecordAt?: string;

  @ApiProperty({ description: 'หมายเหตุ', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [OrderDetailCreateDto], required: false })
  @IsOptional()
  @IsArray()
  details?: OrderDetailCreateDto[];
}
