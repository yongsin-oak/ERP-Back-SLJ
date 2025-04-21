import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../entities/product.entity';

export class ResponseEditProduct {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: Product })
  product: Product;
}
