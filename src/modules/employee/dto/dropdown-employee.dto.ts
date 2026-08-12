import { ApiProperty } from '@nestjs/swagger';

/**
 * Employee option row. Ships the name parts unjoined rather than a single
 * `name`, because the picker renders "First Last (nickname)" and search-term
 * highlighting has to line up with the same string the client built.
 *
 * The list is ordered by `firstName` (then id) — there is no full-name column to
 * key a cursor on, and adding a generated one is not worth it for a picker.
 */
export class EmployeeDropdownItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  nickname: string;
}
