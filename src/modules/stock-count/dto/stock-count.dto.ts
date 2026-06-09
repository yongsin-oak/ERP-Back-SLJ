import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { StockCountStatus } from '../entities/stock-count.entity';

export class CreateStockCountDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class GetStockCountDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(StockCountStatus)
  status?: StockCountStatus;
}

export class UpdateItemDto {
  @IsString()
  productBarcode: string;

  @IsInt()
  @Min(0)
  countedQty: number;
}

export class UpdateStockCountItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateItemDto)
  items: UpdateItemDto[];
}
