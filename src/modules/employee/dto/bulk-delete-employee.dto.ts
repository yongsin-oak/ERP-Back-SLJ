import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

/**
 * Ceiling per bulk-delete call. The batch is deleted in one statement, so it
 * stays small enough to keep the whole delete a short, reviewable operation.
 */
const MAX_BULK_DELETE_EMPLOYEE_IDS = 100;

export class BulkDeleteEmployeeDto {
  @ApiProperty({
    type: [String],
    example: ['EMP-xxxx', 'EMP-yyyy'],
    maxItems: MAX_BULK_DELETE_EMPLOYEE_IDS,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMaxSize(MAX_BULK_DELETE_EMPLOYEE_IDS, {
    message: `ลบพนักงานได้สูงสุด ${MAX_BULK_DELETE_EMPLOYEE_IDS} รายการต่อครั้ง`,
  })
  ids: string[];
}
