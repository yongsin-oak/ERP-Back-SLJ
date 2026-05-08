import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ReportGroupBy {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export class SalesSummaryQueryDto {
  @ApiProperty({ description: 'ISO8601' })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({ description: 'ISO8601' })
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
  @ApiProperty({ description: 'ISO8601' })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({ description: 'ISO8601' })
  @IsDateString()
  @IsNotEmpty()
  dateTo: string;
}

export class SalesByProductQueryDto {
  @ApiProperty({ description: 'ISO8601' })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({ description: 'ISO8601' })
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
  @ApiProperty({ description: 'ISO8601' })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({ description: 'ISO8601' })
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
