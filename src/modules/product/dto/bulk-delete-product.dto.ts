import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BulkDeleteProductDto {
  @ApiProperty({
    description: 'Array of product barcodes to delete',
    example: ['P001', 'P002', 'P003'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  barcodes: string[];
}
