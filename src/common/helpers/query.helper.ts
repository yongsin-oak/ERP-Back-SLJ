import { SelectQueryBuilder } from 'typeorm';
import { PaginatedResponseDto } from '../dto/paginated.dto';
import { paginatedResponse } from './response';

/**
 * Apply `skip`/`take`, run `getManyAndCount`, and wrap the result in the
 * standard paginated envelope. Collapses the skip/take/getManyAndCount +
 * paginatedResponse boilerplate repeated in every list endpoint.
 *
 * Pass `map` when the row entity must be reshaped into a response DTO
 * (e.g. flattening a relation into an id) — it runs over the current page only.
 */
export async function paginateQuery<T extends object, R = T>(
  qb: SelectQueryBuilder<T>,
  page: number,
  limit: number,
  map?: (row: T) => R,
): Promise<PaginatedResponseDto<R>> {
  const [rows, total] = await qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  const data = map ? rows.map(map) : (rows as unknown as R[]);
  return paginatedResponse(data, page, limit, total);
}

/**
 * Smart multi-token keyword search. Splits the term on whitespace; every token
 * must match (AND), and each token may match any of the given columns (OR).
 * So "abc 123" matches rows where some column contains "abc" AND some column
 * contains "123" — order-independent, which is what users expect when they type
 * a few words from a name and a code together.
 *
 * `columns` are aliased column refs, e.g. `['p.name', 'p.barcode']`.
 * No-ops when `term` is empty. Mutates and returns `qb` for chaining.
 */
export function applyKeywordSearch<T extends object>(
  qb: SelectQueryBuilder<T>,
  columns: string[],
  term?: string,
): SelectQueryBuilder<T> {
  const trimmed = term?.trim();
  if (!trimmed || !columns.length) return qb;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  tokens.forEach((token, i) => {
    const param = `kw${i}`;
    const clause = columns.map((col) => `${col} ILIKE :${param}`).join(' OR ');
    qb.andWhere(`(${clause})`, { [param]: `%${token}%` });
  });

  return qb;
}

/**
 * Apply an inclusive `[from, to]` range filter on a date/timestamp column.
 * No-ops for whichever bound is absent. Accepts ISO strings or Date.
 * `column` is an aliased column ref, e.g. `'o.startRecordAt'`.
 */
export function applyDateRange<T extends object>(
  qb: SelectQueryBuilder<T>,
  column: string,
  from?: string | Date,
  to?: string | Date,
): SelectQueryBuilder<T> {
  if (from) qb.andWhere(`${column} >= :__dateFrom`, { __dateFrom: new Date(from) });
  if (to) qb.andWhere(`${column} <= :__dateTo`, { __dateTo: new Date(to) });
  return qb;
}

export interface SmartSearchOptions {
  /**
   * Enable pg_trgm fuzzy matching (typo tolerance). Requires the `pg_trgm`
   * extension — the caller must verify it's installed (it degrades to substring
   * matching when off, so a missing extension never 500s).
   */
  fuzzy?: boolean;
  /** Minimum trigram similarity (0..1) for a fuzzy match. Default 0.3. */
  threshold?: number;
}

/**
 * Relevance-ranked search for typeahead/search endpoints. Sets both the WHERE and
 * the ORDER BY, so it replaces the builder's ordering. `columns` are aliased refs
 * in priority order (most authoritative first, e.g. `['p.barcode', 'p.name']`).
 *
 * Matching:
 *  - multi-token substring — every whitespace-separated token must match some
 *    column (AND across tokens, OR across columns); plus
 *  - optional pg_trgm fuzzy — rows whose trigram similarity to the full term
 *    clears `threshold` are also included (catches typos), when `fuzzy` is on.
 *
 * Ranking (best first): exact match → prefix → substring → fuzzy similarity → name.
 * Rank-only (no score column) so callers keep using `paginateQuery`. Use an
 * explicit `similarity() >= threshold` (deterministic) rather than the `%`
 * operator (which depends on the session-global similarity threshold GUC).
 * Apply only to join-free builders — `ORDER BY similarity()` + `getManyAndCount`
 * conflicts with the implicit DISTINCT that to-many joins add.
 */
export function applySmartSearch<T extends object>(
  qb: SelectQueryBuilder<T>,
  columns: string[],
  term?: string,
  opts: SmartSearchOptions = {},
): SelectQueryBuilder<T> {
  const t = term?.trim();
  if (!t || !columns.length) return qb;

  const threshold = opts.threshold ?? 0.3;
  const tokens = t.split(/\s+/).filter(Boolean);
  const simExpr =
    columns.length > 1
      ? `GREATEST(${columns.map((c) => `similarity(${c}, :skTerm)`).join(', ')})`
      : `similarity(${columns[0]}, :skTerm)`;

  // WHERE — every token must match some column, OR (fuzzy) similar enough overall.
  const tokenParams: Record<string, unknown> = {};
  const substringMatch = tokens
    .map((token, i) => {
      tokenParams[`sk${i}`] = `%${token}%`;
      return `(${columns.map((c) => `${c} ILIKE :sk${i}`).join(' OR ')})`;
    })
    .join(' AND ');

  if (opts.fuzzy) {
    qb.andWhere(`((${substringMatch}) OR ${simExpr} >= :skThreshold)`, {
      ...tokenParams,
      skTerm: t,
      skThreshold: threshold,
    });
  } else {
    qb.andWhere(`(${substringMatch})`, tokenParams);
  }

  // ORDER BY relevance: exact (0..) → prefix → substring → else, then fuzzy sim, then name.
  const tiers: string[] = [];
  columns.forEach((c, i) => tiers.push(`WHEN ${c} = :skExact THEN ${i}`));
  const prefixBase = columns.length;
  columns.forEach((c, i) => tiers.push(`WHEN ${c} ILIKE :skPrefix THEN ${prefixBase + i}`));
  const containsBase = prefixBase + columns.length;
  columns.forEach((c, i) => tiers.push(`WHEN ${c} ILIKE :skContains THEN ${containsBase + i}`));
  const fallback = containsBase + columns.length;

  qb.orderBy(`CASE ${tiers.join(' ')} ELSE ${fallback} END`, 'ASC').setParameters({
    skExact: t,
    skPrefix: `${t}%`,
    skContains: `%${t}%`,
  });

  if (opts.fuzzy) {
    qb.addOrderBy(simExpr, 'DESC').setParameter('skTerm', t);
  }
  qb.addOrderBy(columns[columns.length - 1], 'ASC');

  return qb;
}
