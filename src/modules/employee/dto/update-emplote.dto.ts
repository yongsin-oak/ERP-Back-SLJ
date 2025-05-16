import { PartialType } from '@nestjs/swagger';
import { EmployeeCreateDto } from './create-employee.dto';

export class EmployeeUpdateDto extends PartialType(EmployeeCreateDto) {}
