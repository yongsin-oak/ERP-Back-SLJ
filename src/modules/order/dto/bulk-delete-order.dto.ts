import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BulkDeleteOrderDto {
  @ApiProperty({
    description: 'Array of order IDs to delete',
    example: ['ORD-20260501-xxxx', 'ORD-20260501-yyyy'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];
}
