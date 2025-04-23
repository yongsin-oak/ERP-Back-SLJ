import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CategoryCreateDto {
  @ApiProperty({
    description: 'Name of the category',
    example: 'Nike',
  })
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Parent category ID',
    example: 1,
  })
  @IsOptional()
  parentId?: number;
}
