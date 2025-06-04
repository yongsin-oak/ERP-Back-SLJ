import { PartialType } from '@nestjs/swagger';
import { ShopCreateDto } from './create-shop.dto';

export class ShopUpdateDto extends PartialType(ShopCreateDto) {}
