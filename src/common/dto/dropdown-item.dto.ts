import { ApiProperty } from '@nestjs/swagger';

/**
 * Default dropdown row: just enough to render an option and submit a value.
 *
 * Dropdown endpoints project down to this on purpose — the picker shows a label
 * and returns an id, so shipping the full entity is bytes the client throws away
 * on every keystroke. Modules whose option needs more (shop platform, employee
 * name parts) declare their own item DTO instead of widening this one.
 */
export class DropdownItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
