import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BulkDeleteEmployeeDto {
  @ApiProperty({ type: [String], example: ['EMP-xxxx', 'EMP-yyyy'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];
}
