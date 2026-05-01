import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CheckExistOrderDto {
  @ApiProperty({
    description: 'Array of order IDs to check',
    example: ['ORD-20260501-xxxx', 'ORD-20260501-yyyy'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];
}
