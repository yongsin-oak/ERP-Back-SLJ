import { PartialType } from '@nestjs/swagger';
import { CategoryCreateDto } from './create-category.dto';

export class CategoryUpdateDto extends PartialType(CategoryCreateDto) {}
