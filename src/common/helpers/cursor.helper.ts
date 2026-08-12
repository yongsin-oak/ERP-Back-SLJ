import { SelectQueryBuilder } from 'typeorm';
import { DropdownResponseDto } from '../dto/dropdown-response.dto';
import { badRequest } from './response';

/**
 * Keyset cursor for dropdown / infinite-scroll endpoints.
 *
 * `s` = value of the sort column on the last row of the page, `i` = its id.
 * Together they are unique (id is a PK), which is what makes the keyset seek
 * total: `WHERE (sort, id) > (s, i)` resumes at exactly one row, no matter how
 * many rows were inserted or deleted since the previous page was served.
 *
 * Encoded base64url and treated as opaque by the client — the shape below is
 * free to change without breaking callers, as long as an in-flight cursor from
 * the previous shape is rejected as invalid rather than misread.
 */
interface KeysetCursor {
  s: string;
  i: string;
}

export function encodeCursor(cursor: KeysetCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

/**
 * Decode a client-supplied cursor. Anything that is not a well-formed cursor is
 * a 400, never a 500 — the value round-trips through the client, so a truncated
 * URL or a stale bookmark reaches this function as ordinary untrusted input.
 */
export function decodeCursor(raw: string): KeysetCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw badRequest('cursor ไม่ถูกต้อง');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as KeysetCursor).s !== 'string' ||
    typeof (parsed as KeysetCursor).i !== 'string'
  ) {
    throw badRequest('cursor ไม่ถูกต้อง');
  }
  return parsed as KeysetCursor;
}

export interface CursorPaginateOptions<T, R> {
  /** Rows per page. Cap it in the DTO (`DropdownQueryDto` allows up to 50). */
  limit: number;
  /** Opaque cursor from the previous page's `nextCursor`. Absent = first page. */
  cursor?: string;
  /**
   * Aliased ref of the column the list is ordered by, e.g. `'b.name'`.
   * Must be a plain, selected entity property — the last page row is read back
   * through it to build the next cursor, and a computed/aliased expression has
   * no property to read.
   */
  sortColumn: string;
  /** Aliased ref of the primary key, e.g. `'b.id'`. Same constraint as above. */
  idColumn: string;
  /** Reshape each row into the response DTO. Runs over the current page only. */
  map?: (row: T) => R;
}

/** `'b.name'` → `'name'` — the entity property the column ref points at. */
function propOf(columnRef: string): string {
  const prop = columnRef.split('.').pop();
  if (!prop) throw new Error(`Invalid column ref: ${columnRef}`);
  return prop;
}

/**
 * Run a keyset-paginated query and wrap it in the dropdown envelope.
 *
 * **Sets the ORDER BY itself** (`sortColumn ASC, idColumn ASC`) and overwrites
 * whatever the caller set, because a keyset predicate is only correct when it
 * matches the sort exactly. That rules out relevance-ranked ordering
 * (`applySmartSearch`) on these endpoints — use its *matching* only, or accept
 * offset pagination on a non-dropdown route instead.
 *
 * Fetches `limit + 1` rows to learn whether another page exists without a
 * `COUNT(*)` — dropdowns never show a total, so paying for one is waste.
 */
export async function cursorPaginateQuery<T extends object, R = T>(
  qb: SelectQueryBuilder<T>,
  opts: CursorPaginateOptions<T, R>,
): Promise<DropdownResponseDto<R>> {
  const { limit, cursor, sortColumn, idColumn, map } = opts;

  if (cursor) {
    const { s, i } = decodeCursor(cursor);
    // Row-wise comparison — one index seek on (sort, id), not a per-column OR chain.
    qb.andWhere(`(${sortColumn}, ${idColumn}) > (:__cursorSort, :__cursorId)`, {
      __cursorSort: s,
      __cursorId: i,
    });
  }

  const rows = await qb
    .orderBy(sortColumn, 'ASC')
    .addOrderBy(idColumn, 'ASC')
    .take(limit + 1)
    .getMany();

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];

  const nextCursor =
    hasMore && last
      ? encodeCursor({
          s: String(last[propOf(sortColumn) as keyof T]),
          i: String(last[propOf(idColumn) as keyof T]),
        })
      : null;

  return {
    data: map ? pageRows.map(map) : (pageRows as unknown as R[]),
    nextCursor,
  };
}
