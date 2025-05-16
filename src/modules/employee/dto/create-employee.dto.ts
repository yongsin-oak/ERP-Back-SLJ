import { ApiProperty } from '@nestjs/swagger';

export class EmployeeCreateDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the employee',
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the employee',
  })
  lastName: string;

  @ApiProperty({
    example: 'Johnny',
    description: 'Nickname of the employee',
  })
  nickname: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Phone number of the employee',
    required: false,
  })
  phoneNumber?: string;

  @ApiProperty({
    example: '2023-01-01',
    description: 'Start date of the employee',
    type: String,
    format: 'date-time',
    required: false,
  })
  startDate?: Date;

  @ApiProperty({
    example: 'Sales',
    description: 'Department of the employee',
  })
  department: string;
}
