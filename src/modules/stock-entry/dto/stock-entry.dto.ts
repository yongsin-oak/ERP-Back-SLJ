import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { StockEntryType } from '../entities/stock-entry.entity';

export class CreateStockEntryDto {
  @ApiProperty({ example: 'P001' })
  @IsString()
  @IsNotEmpty()
  productBarcode: string;

  @ApiProperty({ enum: StockEntryType, example: StockEntryType.IN })
  @IsEnum(StockEntryType)
  type: StockEntryType;

  @ApiProperty({ description: 'จำนวน — สำหรับ adjust คือค่า remaining ใหม่', example: 10 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'EMP-xxxx', required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class StockEntryGetDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productBarcode?: string;
}
