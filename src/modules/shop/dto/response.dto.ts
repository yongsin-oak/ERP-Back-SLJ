import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '../entities/platform.enum';

export class ShopResponseDto {
  @ApiProperty({
    example: 1,
  })
  id: string;

  @ApiProperty({
    example: 'Shop Name',
  })
  name: string;

  @ApiProperty({
    example: 'Shop description',
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: Platform.Shopee,
  })
  platform: Platform;

  @ApiProperty({
    type: Date,
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    type: Date,
    format: 'date-time',
  })
  updatedAt: Date;
}
