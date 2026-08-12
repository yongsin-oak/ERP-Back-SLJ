import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Bounds for every caller-supplied dashboard number. Each one drives an
 * aggregate over `order_detail`/`product`, so the API caps the work instead of
 * trusting the client (an uncapped `days` or `limit` is an unbounded scan).
 */
export const DAILY_REVENUE_DEFAULT_DAYS = 7;
export const DAILY_REVENUE_MIN_DAYS = 1;
export const DAILY_REVENUE_MAX_DAYS = 90;

export const RECENT_ORDERS_DEFAULT_LIMIT = 5;
export const RECENT_ORDERS_MIN_LIMIT = 1;
export const RECENT_ORDERS_MAX_LIMIT = 50;

/** Mirrors the DB default of `Product.minStock` — the low-stock threshold and the fallback when a product has no minStock. */
export const DEFAULT_MIN_STOCK = 5;
export const LOW_STOCK_MIN_THRESHOLD = 0;
export const LOW_STOCK_MAX_THRESHOLD = 10000;
export const LOW_STOCK_DEFAULT_LIMIT = 50;
export const LOW_STOCK_MIN_LIMIT = 1;
export const LOW_STOCK_MAX_LIMIT = 200;

export class DashboardFilterQueryDto {
  @ApiPropertyOptional({ description: 'Filter by shop ID' })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ description: 'Start date ISO8601 (defaults to today)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date ISO8601 (defaults to today)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class DailyRevenueQueryDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: DAILY_REVENUE_MIN_DAYS,
    maximum: DAILY_REVENUE_MAX_DAYS,
    default: DAILY_REVENUE_DEFAULT_DAYS,
    description: `Number of past days — max ${DAILY_REVENUE_MAX_DAYS} (default ${DAILY_REVENUE_DEFAULT_DAYS})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(DAILY_REVENUE_MIN_DAYS)
  @Max(DAILY_REVENUE_MAX_DAYS)
  days?: number;

  @ApiPropertyOptional({ description: 'Filter by shop ID' })
  @IsOptional()
  @IsString()
  shopId?: string;
}

export class RecentOrdersQueryDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: RECENT_ORDERS_MIN_LIMIT,
    maximum: RECENT_ORDERS_MAX_LIMIT,
    default: RECENT_ORDERS_DEFAULT_LIMIT,
    description: `Max rows to return — max ${RECENT_ORDERS_MAX_LIMIT} (default ${RECENT_ORDERS_DEFAULT_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(RECENT_ORDERS_MIN_LIMIT)
  @Max(RECENT_ORDERS_MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by shop ID' })
  @IsOptional()
  @IsString()
  shopId?: string;
}

export class LowStockQueryDto {
  // `threshold` has no entry in the validation humanizer's field labels, so the
  // Thai wording is supplied here (Thai messages are passed through verbatim).
  @ApiPropertyOptional({
    type: Number,
    minimum: LOW_STOCK_MIN_THRESHOLD,
    maximum: LOW_STOCK_MAX_THRESHOLD,
    default: DEFAULT_MIN_STOCK,
    description: `Stock level counted as low — max ${LOW_STOCK_MAX_THRESHOLD} (default ${DEFAULT_MIN_STOCK})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'เกณฑ์สต็อกต่ำต้องเป็นตัวเลขจำนวนเต็ม' })
  @Min(LOW_STOCK_MIN_THRESHOLD, { message: 'เกณฑ์สต็อกต่ำน้อยกว่าค่าที่กำหนด' })
  @Max(LOW_STOCK_MAX_THRESHOLD, { message: 'เกณฑ์สต็อกต่ำเกินค่าที่กำหนด' })
  threshold?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: LOW_STOCK_MIN_LIMIT,
    maximum: LOW_STOCK_MAX_LIMIT,
    default: LOW_STOCK_DEFAULT_LIMIT,
    description: `Max rows to return — max ${LOW_STOCK_MAX_LIMIT} (default ${LOW_STOCK_DEFAULT_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(LOW_STOCK_MIN_LIMIT)
  @Max(LOW_STOCK_MAX_LIMIT)
  limit?: number;
}

export class DashboardStatsDto {
  @ApiProperty() totalOrders: number;
  @ApiProperty() totalRevenue: number;
  @ApiProperty() totalCost: number;
  @ApiProperty() totalProducts: number;
  @ApiProperty() totalEmployees: number;
  @ApiProperty() todayOrders: number;
  @ApiProperty() todayRevenue: number;
  @ApiProperty() todayCost: number;
  @ApiProperty() lowStockCount: number;
}

export class DailyRevenueDto {
  @ApiProperty() date: string;
  @ApiProperty() revenue: number;
  @ApiProperty() cost: number;
}

export class RecentOrderDto {
  @ApiProperty() id: string;
  @ApiProperty() shopName: string;
  @ApiProperty() platform: string;
  @ApiProperty() totalPrice: number;
  @ApiProperty() createdAt: Date;
}

export class LowStockDto {
  @ApiProperty() barcode: string;
  @ApiProperty() name: string;
  @ApiProperty() remaining: number;
  @ApiProperty() minStock: number;
}
