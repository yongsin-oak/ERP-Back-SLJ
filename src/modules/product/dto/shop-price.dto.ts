import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ProductUnitPrice } from '../entities/product.interface';

export class UnitPriceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  pack?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  carton?: number;
}

export class CreateShopPriceDto {
  @ApiProperty({ example: 'SHOP-xxxx' })
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @ApiProperty({ type: UnitPriceDto })
  @ValidateNested()
  @Type(() => UnitPriceDto)
  sellPrice: ProductUnitPrice;

  @ApiProperty({ required: false, type: UnitPriceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnitPriceDto)
  costPrice?: ProductUnitPrice;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateShopPriceDto {
  @ApiProperty({ required: false, type: UnitPriceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnitPriceDto)
  sellPrice?: ProductUnitPrice;

  @ApiProperty({ required: false, type: UnitPriceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnitPriceDto)
  costPrice?: ProductUnitPrice;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
