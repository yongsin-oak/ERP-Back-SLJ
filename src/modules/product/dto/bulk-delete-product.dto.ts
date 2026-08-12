import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

/**
 * Ceiling per bulk-delete call. The batch is deleted in one statement, so it
 * stays small enough to keep the whole delete a short, reviewable operation.
 */
const MAX_BULK_DELETE_BARCODES = 100;

export class BulkDeleteProductDto {
  @ApiProperty({
    description: 'Array of product barcodes to delete',
    example: ['P001', 'P002', 'P003'],
    type: [String],
    maxItems: MAX_BULK_DELETE_BARCODES,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMaxSize(MAX_BULK_DELETE_BARCODES, {
    message: `ลบสินค้าได้สูงสุด ${MAX_BULK_DELETE_BARCODES} รายการต่อครั้ง`,
  })
  barcodes: string[];
}
