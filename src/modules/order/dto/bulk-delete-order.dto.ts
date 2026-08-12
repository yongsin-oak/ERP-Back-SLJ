import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

/**
 * Ceiling per bulk-delete call. Deleting cascades into order_detail, so the batch
 * stays small enough to keep the whole delete a short, reviewable operation.
 */
const MAX_BULK_DELETE_IDS = 100;

export class BulkDeleteOrderDto {
  @ApiProperty({
    description: 'Array of order IDs to delete',
    example: ['ORD-20260501-xxxx', 'ORD-20260501-yyyy'],
    type: [String],
    maxItems: MAX_BULK_DELETE_IDS,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMaxSize(MAX_BULK_DELETE_IDS, {
    message: `ลบออเดอร์ได้สูงสุด ${MAX_BULK_DELETE_IDS} รายการต่อครั้ง`,
  })
  ids: string[];
}
