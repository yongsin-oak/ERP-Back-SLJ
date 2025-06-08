import { PartialType } from '@nestjs/swagger';
import { OrderDetailCreateDto } from './create-order-detail.dto';

export class OrderDetailUpdateDto extends PartialType(OrderDetailCreateDto) {}
