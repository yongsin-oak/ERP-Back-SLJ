import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { OrderStatus } from '@app/modules/order/entities/order.entity';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class GetOrderDto extends PaginatedGetAllDto {
  @ApiProperty({ required: false, description: 'ค้นหาจาก note' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiProperty({ required: false, description: 'filter ตาม recordBy employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ required: false, description: 'filter ตาม terminal ID' })
  @IsOptional()
  @IsString()
  terminalId?: string;

  @ApiProperty({ required: false, description: 'ISO8601 — startRecordAt >= dateFrom' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false, description: 'ISO8601 — startRecordAt <= dateTo' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
