import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

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
  @ApiPropertyOptional({ type: Number, description: 'Number of past days (default 7)' })
  @IsOptional()
  days?: number;

  @ApiPropertyOptional({ description: 'Filter by shop ID' })
  @IsOptional()
  @IsString()
  shopId?: string;
}

export class RecentOrdersQueryDto {
  @ApiPropertyOptional({ type: Number, description: 'Max rows to return (default 5)' })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by shop ID' })
  @IsOptional()
  @IsString()
  shopId?: string;
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
