import { PartialType } from '@nestjs/swagger';
import { OrderCreateDto } from './create-order.dto';

export class OrderUpdateDto extends PartialType(OrderCreateDto) {}
