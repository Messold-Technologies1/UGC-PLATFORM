import { Prisma } from '@prisma/client';

/**
 * Shortest id fragment treated as an order-id prefix.
 *
 * Four hex characters narrow to roughly 1 order in 65,536, so a term this long
 * that happens to also be a word ("cafe", "beef") costs a stray row at worst —
 * the name clauses are ORed alongside, so nothing is lost either way. Anything
 * shorter would drag a sixteenth of the table into every search.
 */
const MIN_ORDER_ID_PREFIX = 4;

function formatUuid(hex32: string): string {
  return [
    hex32.slice(0, 8),
    hex32.slice(8, 12),
    hex32.slice(12, 16),
    hex32.slice(16, 20),
    hex32.slice(20),
  ].join('-');
}

/**
 * Turn an id fragment into the uuid range it stands for.
 *
 * `Order.id` is a Postgres `uuid` column, so the usual `contains` filter is out
 * — Postgres has no `LIKE` for uuid, and casting to text would throw away the
 * primary key index. A prefix is a contiguous range instead: everything from
 * the fragment padded with zeroes to the same fragment padded with `f`. That
 * is two ordinary comparisons the index serves directly, and it covers both
 * what the UI shows (`Order #AB12CD34`, the first 8 characters) and a whole id
 * pasted out of an order URL, dashes or not.
 *
 * Returns null when the term cannot be part of a uuid, which is the common
 * case — a brand or creator name — and leaves the id clause out entirely.
 */
export function orderIdPrefixRange(
  term: string,
): { gte: string; lte: string } | null {
  const hex = term.trim().toLowerCase().replace(/-/g, '');
  if (hex.length < MIN_ORDER_ID_PREFIX || hex.length > 32) return null;
  if (!/^[0-9a-f]+$/.test(hex)) return null;
  return {
    gte: formatUuid(hex.padEnd(32, '0')),
    lte: formatUuid(hex.padEnd(32, 'f')),
  };
}

/**
 * The admin order search: one box over every party on the order plus its id.
 *
 * Deliberately matches the names the admin list actually prints, so a term
 * read off a row finds that row back:
 *  - the creator's display name;
 *  - the brand name for a brand-placed order;
 *  - the agency's name for an agency-placed one;
 *  - the client brand named on the brief, which is what the row shows in place
 *    of the agency's own name when an agency buys for a client;
 *  - the partner agency credited on a brand's order (`placedByAgency`), which
 *    the row prints as "placed by".
 *
 * Returns undefined for an empty term so callers can spread it unconditionally.
 */
export function buildAdminOrdersSearchWhere(
  search?: string,
): Prisma.OrderWhereInput | undefined {
  const q = search?.trim();
  if (!q) return undefined;

  const like = { contains: q, mode: 'insensitive' as const };
  const or: Prisma.OrderWhereInput[] = [
    { creator: { displayName: like } },
    { brand: { brandName: like } },
    { agency: { name: like } },
    { placedByAgency: { name: like } },
    { briefRef: { brandName: like } },
  ];

  const idRange = orderIdPrefixRange(q);
  if (idRange) or.push({ id: idRange });

  return { OR: or };
}
