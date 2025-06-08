import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Platform } from '../entities/platform.enum';

export class ShopCreateDto {
  @ApiProperty({
    example: 'slj',
  })
  @IsString({
    message: 'Name must be a string',
  })
  @IsNotEmpty({
    message: 'Name is required',
  })
  name: string;

  @ApiProperty({
    example: 'Shop description',
    required: false,
  })
  @IsString({
    message: 'Description must be a string',
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: Platform.Shopee,
  })
  @IsEnum(Platform, {
    message: `Platform must be one of the following: ${Object.values(Platform).join(', ')}`,
  })
  @IsNotEmpty({
    message: 'Platform is required',
  })
  platform: Platform; // Assuming Platform is a string enum or similar
}