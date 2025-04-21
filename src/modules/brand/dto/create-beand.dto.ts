import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class BrandCreateDto {
  @ApiProperty({
    description: 'Name of the brand',
    example: 'Nike',
  })
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty({
    description: 'Description of the brand',
    example: 'A leading sportswear brand',
  })
  @IsOptional()
  description?: string;
}
