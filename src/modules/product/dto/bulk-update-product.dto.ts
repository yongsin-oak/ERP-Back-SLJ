import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductUpdateDto } from './update-product.dto';

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
  })
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateProductItemDto)
  products: BulkUpdateProductItemDto[];
}
