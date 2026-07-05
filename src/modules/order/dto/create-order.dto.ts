import { OrderDetailCreateDto } from '@app/modules/order-detail/dto/create-order-detail.dto';
import { OrderStatus } from '@app/modules/order/entities/order.entity';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OrderCreateDto {
  // recordBy (ผู้บันทึก) + terminalId ถูก derive จาก actor token ฝั่ง server —
  // ไม่รับจาก client เพื่อกันการปลอมแปลง (ดู ActorGuard + order.service.create)

  @ApiProperty({ description: 'Shop ID', example: 'SHOP-xxxx' })
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @ApiProperty({ description: 'เลขคำสั่งซื้อจากแพลตฟอร์ม', example: '2504XXXX', required: false })
  @IsOptional()
  @IsString()
  orderNumber?: string;

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
