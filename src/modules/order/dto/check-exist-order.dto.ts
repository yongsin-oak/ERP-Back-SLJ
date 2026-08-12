import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

/**
 * Ceiling per check-exist call. This is a read-only existence probe (one IN
 * lookup), so it can take a bigger batch than the write endpoints — but the IN
 * list still has to stay bounded.
 */
const MAX_CHECK_EXIST_IDS = 500;

export class CheckExistOrderDto {
  @ApiProperty({
    description: 'Array of order IDs to check',
    example: ['ORD-20260501-xxxx', 'ORD-20260501-yyyy'],
    type: [String],
    maxItems: MAX_CHECK_EXIST_IDS,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMaxSize(MAX_CHECK_EXIST_IDS, {
    message: `ตรวจสอบออเดอร์ได้สูงสุด ${MAX_CHECK_EXIST_IDS} รายการต่อครั้ง`,
  })
  ids: string[];
}
