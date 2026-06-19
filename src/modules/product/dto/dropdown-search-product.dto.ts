import { DropdownQueryDto } from '@app/common/dto/dropdown-query.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ProductDropdownSearchDto extends DropdownQueryDto {}

export class ProductDropdownItemDto {
  @ApiProperty()
  barcode: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  remaining: number;

  @ApiProperty()
  sellPrice: { pack: number; carton: number };

  @ApiProperty()
  costPrice: { pack: number; carton: number };
}
