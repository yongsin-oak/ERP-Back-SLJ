import { PartialType } from '@nestjs/swagger';
import { BrandCreateDto } from './create-brand.dto';

export class BrandUpdateDto extends PartialType(BrandCreateDto) {}
