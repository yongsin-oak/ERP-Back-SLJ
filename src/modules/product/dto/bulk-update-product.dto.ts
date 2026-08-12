import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductUpdateDto } from './update-product.dto';

/**
 * Ceiling per bulk-update call. The batch runs as one transaction, so the cap
 * bounds how long rows stay locked.
 */
const MAX_BULK_UPDATE_PRODUCTS = 1_000;

export class BulkUpdateProductItemDto {
  @ApiProperty({
    description: 'Product barcode to update',
    example: 'P001',
  })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({
    description: 'Product data to update',
    type: ProductUpdateDto,
  })
  @ValidateNested()
  @Type(() => ProductUpdateDto)
  data: ProductUpdateDto;
}

export class BulkUpdateProductDto {
  @ApiProperty({
    description: 'Array of products to update',
    type: [BulkUpdateProductItemDto],
    maxItems: MAX_BULK_UPDATE_PRODUCTS,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateProductItemDto)
  @ArrayMaxSize(MAX_BULK_UPDATE_PRODUCTS, {
    message: `อัปเดตสินค้าได้สูงสุด ${MAX_BULK_UPDATE_PRODUCTS} รายการต่อครั้ง`,
  })
  products: BulkUpdateProductItemDto[];
}
