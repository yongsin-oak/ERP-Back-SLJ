import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
export class CategoryGetDto extends PaginatedGetAllDto {
  @ApiProperty({ required: false })
  @IsOptional()
  parentId?: string;
}
