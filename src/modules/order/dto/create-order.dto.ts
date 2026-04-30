import { OrderDetailCreateDto } from '@app/modules/order-detail/dto/create-order-detail.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OrderCreateDto {
  @ApiProperty({ description: 'Employee ID (ผู้บันทึก)', example: 'EMP-xxxx' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @ApiProperty({ description: 'Shop ID', example: 'SHOP-xxxx' })
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @ApiProperty({ type: [OrderDetailCreateDto], required: false })
  @IsOptional()
  @IsArray()
  details?: OrderDetailCreateDto[];
}
