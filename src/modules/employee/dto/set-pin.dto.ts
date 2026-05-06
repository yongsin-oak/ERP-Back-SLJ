import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class SetPinDto {
  @ApiProperty({ example: '1234', description: '4–6 digit numeric PIN' })
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4–6 digits' })
  pin: string;
}
