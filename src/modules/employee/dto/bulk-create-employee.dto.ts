import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { EmployeeCreateDto } from './create-employee.dto';

export class BulkCreateEmployeeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeCreateDto)
  employees: EmployeeCreateDto[];
}
