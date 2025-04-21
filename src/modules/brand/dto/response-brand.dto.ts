import { ApiProperty } from '@nestjs/swagger';
import { Brand } from '../entities/brand.entity';
import { BrandGetAllDto } from './get-brand.dto';

export class BrandResponseAllDto extends BrandGetAllDto {
  @ApiProperty({ type: [Brand] })
  data: Brand[];
}
