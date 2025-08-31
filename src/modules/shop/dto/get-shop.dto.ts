import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Platform } from '../entities/platform.enum';
export class ShopGetDto extends PaginatedGetAllDto {
  @ApiProperty({ required: false, enum: Platform })
  @IsOptional()
  platform?: Platform;
}
