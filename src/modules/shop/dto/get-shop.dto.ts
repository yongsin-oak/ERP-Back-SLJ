import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Platform } from '../entities/platform.enum';
export class ShopGetDto extends PaginatedGetAllDto {
  @ApiPropertyOptional({ enum: Platform })
  @IsOptional()
  platform?: Platform;

  @ApiPropertyOptional({ description: 'Search by shop name' })
  @IsOptional()
  @IsString()
  search?: string;
}
