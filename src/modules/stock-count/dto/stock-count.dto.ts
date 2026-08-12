import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { StockCountStatus } from '../entities/stock-count.entity';

/**
 * Upper bound for one save of a counted sheet. Sized to hold a whole catalogue
 * in a single request; a larger sheet must be sent in batches so one request
 * can't pin a connection (statement_timeout is 30s) or blow the body limit.
 */
export const MAX_STOCK_COUNT_ITEMS_PER_REQUEST = 10_000;

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
  @ArrayMaxSize(MAX_STOCK_COUNT_ITEMS_PER_REQUEST, {
    message: `บันทึกได้ครั้งละไม่เกิน ${MAX_STOCK_COUNT_ITEMS_PER_REQUEST} รายการ กรุณาแบ่งส่งเป็นชุด`,
  })
  @ValidateNested({ each: true })
  @Type(() => UpdateItemDto)
  items: UpdateItemDto[];
}
