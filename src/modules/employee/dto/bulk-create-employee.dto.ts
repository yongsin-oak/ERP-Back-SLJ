import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { EmployeeCreateDto } from './create-employee.dto';

/**
 * Ceiling per bulk-create call. The duplicate check builds one OR-per-row WHERE
 * clause, so the batch has to stay bounded for that query to remain sane.
 */
const MAX_BULK_CREATE_EMPLOYEES = 500;

export class BulkCreateEmployeeDto {
  @ApiProperty({ type: [EmployeeCreateDto], maxItems: MAX_BULK_CREATE_EMPLOYEES })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeCreateDto)
  @ArrayMaxSize(MAX_BULK_CREATE_EMPLOYEES, {
    message: `เพิ่มพนักงานได้สูงสุด ${MAX_BULK_CREATE_EMPLOYEES} รายการต่อครั้ง`,
  })
  employees: EmployeeCreateDto[];
}
