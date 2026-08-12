import { OrderDetailCreateDto } from '@app/modules/order-detail/dto/create-order-detail.dto';
import { OrderStatus } from '@app/modules/order/entities/order.entity';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Ceiling on line items per order. Every detail costs a row plus a generated id
 * on create and a full rewrite on update, so one request must not be able to ask
 * for unbounded work — a real POS order never comes close to this.
 */
const MAX_ORDER_DETAILS = 200;

export class OrderCreateDto {
  // recordBy (ผู้บันทึก) + terminalId ถูก derive จาก actor token ฝั่ง server —
  // ไม่รับจาก client เพื่อกันการปลอมแปลง (ดู ActorGuard + order.service.create)

  @ApiProperty({ description: 'Shop ID', example: 'SHOP-xxxx' })
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @ApiProperty({ description: 'เลขคำสั่งซื้อจากแพลตฟอร์ม', example: '2504XXXX' })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

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

  @ApiProperty({ type: [OrderDetailCreateDto], required: false, maxItems: MAX_ORDER_DETAILS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ORDER_DETAILS, {
    message: `รายการสินค้าในออเดอร์ต้องไม่เกิน ${MAX_ORDER_DETAILS} รายการต่อ 1 ออเดอร์`,
  })
  details?: OrderDetailCreateDto[];
}
