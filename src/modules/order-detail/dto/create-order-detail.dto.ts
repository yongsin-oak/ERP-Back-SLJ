import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class OrderDetailCreateDto {
  @ApiProperty({
    description: 'product barcode',
  })
  @IsNotEmpty({
    message: 'Product barcode is required',
  })
  @IsString({
    message: 'Product barcode must be a string',
  })
  productBarcode: string;

  @ApiProperty({
    description: 'quantity of product',
    type: Number,
  })
  @IsNotEmpty({
    message: 'Quantity is required',
  })
  @IsNumber(
    {},
    {
      message: 'Quantity must be a number',
    },
  )
  quantity: number;
}
