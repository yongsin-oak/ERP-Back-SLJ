import { PartialType } from '@nestjs/swagger';
import { ProductCreateDto } from './create-product.dto';

export class ProductUpdateDto extends PartialType(ProductCreateDto) {

}
