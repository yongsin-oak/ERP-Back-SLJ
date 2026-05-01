import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CheckExistProductDto {
  @ApiProperty({
    description: 'Array of product barcodes to check',
    example: ['8850999123456', '8850999654321'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  barcodes: string[];
}
