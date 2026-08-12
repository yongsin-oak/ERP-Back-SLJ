import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '../entities/platform.enum';

/**
 * Shop option row. Carries `platform` on top of the usual id/name because a shop
 * name is only unique *within* a platform — "SLJ Official" exists on Shopee and
 * on Lazada, and an option list showing the name alone cannot be told apart.
 */
export class ShopDropdownItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: Platform })
  platform: Platform;
}
