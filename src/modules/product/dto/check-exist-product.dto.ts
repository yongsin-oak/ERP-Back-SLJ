import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

/**
 * Ceiling per check call. Read-only and answered by one `IN (...)` query, so the
 * cap is generous — an import preview checks a whole spreadsheet at once.
 */
const MAX_CHECK_EXIST_BARCODES = 5_000;

export class CheckExistProductDto {
  @ApiProperty({
    description: 'Array of product barcodes to check',
    example: ['8850999123456', '8850999654321'],
    type: [String],
    maxItems: MAX_CHECK_EXIST_BARCODES,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMaxSize(MAX_CHECK_EXIST_BARCODES, {
    message: `ตรวจสอบสินค้าได้สูงสุด ${MAX_CHECK_EXIST_BARCODES} รายการต่อครั้ง`,
  })
  barcodes: string[];
}
