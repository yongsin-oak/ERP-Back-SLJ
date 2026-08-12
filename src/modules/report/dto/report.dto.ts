import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ReportGroupBy {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

/**
 * Widest span a single report request may cover. Every report aggregates the
 * whole range in one query, so an unbounded span would scan the entire table.
 * Enforced in ReportService.resolveDateRange (applies to /export too).
 */
export const MAX_REPORT_RANGE_DAYS = 366;

const DATE_RANGE_DESCRIPTION = `ISO8601 (ช่วง dateFrom–dateTo ต้องไม่เกิน ${MAX_REPORT_RANGE_DAYS} วัน)`;

export class SalesSummaryQueryDto {
  @ApiProperty({ description: DATE_RANGE_DESCRIPTION })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({ description: DATE_RANGE_DESCRIPTION })
  @IsDateString()
  @IsNotEmpty()
  dateTo: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiProperty({ enum: ReportGroupBy, default: ReportGroupBy.Day })
  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy;
}

export class SalesByShopQueryDto {
  @ApiProperty({ description: DATE_RANGE_DESCRIPTION })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({ description: DATE_RANGE_DESCRIPTION })
  @IsDateString()
  @IsNotEmpty()
  dateTo: string;
}

export class SalesByProductQueryDto {
  @ApiProperty({ description: DATE_RANGE_DESCRIPTION })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({ description: DATE_RANGE_DESCRIPTION })
  @IsDateString()
  @IsNotEmpty()
  dateTo: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brandId?: string;
}

export class ManHourQueryDto {
  @ApiProperty({ description: DATE_RANGE_DESCRIPTION })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({ description: DATE_RANGE_DESCRIPTION })
  @IsDateString()
  @IsNotEmpty()
  dateTo: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class SalesSummaryItemDto {
  @ApiProperty() date: string;
  @ApiProperty() revenue: number;
  @ApiProperty() cost: number;
  @ApiProperty() profit: number;
  @ApiProperty() orderCount: number;
}

export class SalesByShopItemDto {
  @ApiProperty() shopId: string;
  @ApiProperty() shopName: string;
  @ApiProperty() platform: string;
  @ApiProperty() revenue: number;
  @ApiProperty() cost: number;
  @ApiProperty() orderCount: number;
}

export class SalesByProductItemDto {
  @ApiProperty() barcode: string;
  @ApiProperty() name: string;
  @ApiProperty() quantityPack: number;
  @ApiProperty() quantityCarton: number;
  @ApiProperty() revenue: number;
  @ApiProperty() cost: number;
  @ApiProperty() profit: number;
}

export class ManHourItemDto {
  @ApiProperty() employeeId: string;
  @ApiProperty() name: string;
  @ApiProperty() orderCount: number;
  @ApiProperty() totalMinutes: number;
  @ApiProperty() avgMinutesPerOrder: number;
}
