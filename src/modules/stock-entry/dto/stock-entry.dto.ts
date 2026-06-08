import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
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

  @ApiProperty({ required: false, description: 'ราคาต้นทุนต่อหน่วย ณ เวลาที่บันทึก' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  costPricePerUnit?: number;
}

export class BulkStockEntryItemDto {
  @ApiProperty({ example: '8850999123456' })
  @IsString()
  @IsNotEmpty()
  productBarcode: string;

  @ApiProperty({ enum: StockEntryType, example: StockEntryType.IN })
  @IsEnum(StockEntryType)
  type: StockEntryType;

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ required: false, description: 'ราคาต้นทุนต่อหน่วย ณ เวลาที่บันทึก' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  costPricePerUnit?: number;
}

export class BulkCreateStockEntryDto {
  @ApiProperty({ required: false, example: 'EMP-xxxx' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [BulkStockEntryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStockEntryItemDto)
  entries: BulkStockEntryItemDto[];
}

export class BulkAdjustItemDto {
  @ApiProperty({ example: '8850999123456' })
  @IsString()
  @IsNotEmpty()
  productBarcode: string;

  @ApiProperty({ description: 'จำนวนจริงที่นับได้ — จะ set remaining เป็นค่านี้', example: 450 })
  @IsInt()
  @Min(0)
  actualQuantity: number;
}

export class BulkAdjustStockEntryDto {
  @ApiProperty({ required: false, example: 'EMP-xxxx' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [BulkAdjustItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAdjustItemDto)
  adjustments: BulkAdjustItemDto[];
}

export class StockEntryGetDto extends PaginatedGetAllDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productBarcode?: string;

  @ApiProperty({ required: false, enum: StockEntryType })
  @IsOptional()
  @IsEnum(StockEntryType)
  type?: StockEntryType;

  @ApiProperty({ required: false, example: 'EMP-xxxx' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ required: false, description: 'ISO8601 — createdAt >= dateFrom' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false, description: 'ISO8601 — createdAt <= dateTo' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
