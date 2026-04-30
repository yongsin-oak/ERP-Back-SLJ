import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty() totalOrders: number;
  @ApiProperty() totalRevenue: number;
  @ApiProperty() totalCost: number;
  @ApiProperty() totalProducts: number;
  @ApiProperty() totalEmployees: number;
  @ApiProperty() todayOrders: number;
  @ApiProperty() todayRevenue: number;
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
