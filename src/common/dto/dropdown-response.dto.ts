import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

/**
 * Envelope for dropdown / infinite-scroll endpoints.
 *
 * Deliberately *not* `PaginatedResponseDto`: a dropdown is consumed by scrolling
 * forward until the list runs out, so `page`/`total`/`totalPages` are never read
 * and the `COUNT(*)` behind `total` is pure cost. Keyset cursors are also stable
 * under concurrent inserts, which offset pages are not — the difference shows up
 * as rows silently skipped or repeated while the user scrolls.
 *
 * A table list is the opposite case (jump to page 7, show "1–20 of 340") and
 * keeps `PaginatedResponseDto`. Endpoints never serve both shapes.
 */
export class DropdownResponseDto<T> {
  @IsArray()
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Opaque cursor for the next page — pass it back as `cursor`. `null` means the list is exhausted.',
    example: 'eyJzIjoi4LiB4Lil4LmI4Lit4LiHIiwiaSI6IkJSRDAwMSJ9',
  })
  nextCursor: string | null;
}
