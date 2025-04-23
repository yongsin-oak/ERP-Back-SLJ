import { PaginatedGetAllDto } from 'src/common/dto/paginated.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
export class CategoryGetDto extends PaginatedGetAllDto {
  @ApiProperty({ type: Number, required: false })
  @IsOptional()
  parentId?: number;
}
