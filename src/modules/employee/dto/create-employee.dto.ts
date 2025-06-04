import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Role } from 'src/auth/role/role.enum';

export class EmployeeCreateDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the employee',
  })
  @IsNotEmpty({
    message: 'First name is required',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the employee',
  })
  @IsNotEmpty({
    message: 'Last name is required',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: 'Johnny',
    description: 'Nickname of the employee',
  })
  @IsNotEmpty({
    message: 'Nickname is required',
  })
  @IsString()
  nickname: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Phone number of the employee',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    example: '2023-01-01',
    description: 'Start date of the employee',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    example: Role.Operator,
    description: 'Department of the employee',
  })
  @IsNotEmpty({
    message: 'Department is required',
  })
  @IsEnum(Role, {
    message: 'Department must be one of the predefined roles',
  })
  department: Role;
}
