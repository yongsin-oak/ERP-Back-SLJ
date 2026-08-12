import { ApiProperty } from '@nestjs/swagger';

/**
 * Reference projection of a product: identifier + label, nothing else.
 *
 * This is the smallest shape that still lets a client name a product — used by
 * order scanning, where the screen shows no price, stock, brand or category.
 * Keeping it to these two columns is what lets the query skip the brand/category
 * joins that findOne() performs.
 *
 * If a caller needs more than identifier + label, it does not want a ref — add or
 * use a `summary` projection instead. See standard-naming-conventions § Projections.
 */
export class ProductRefDto {
  @ApiProperty()
  barcode: string;

  @ApiProperty()
  name: string;
}
