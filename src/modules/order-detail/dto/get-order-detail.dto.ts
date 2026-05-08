import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GetOrderDetailDto extends PaginatedGetAllDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productBarcode?: string;

  @ApiProperty({ required: false, description: 'ISO8601 — createdAt >= dateFrom' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false, description: 'ISO8601 — createdAt <= dateTo' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
