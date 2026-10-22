/**
 * Rewrites stored absolute CDN URLs after the S3 + CloudFront account move.
 *
 * Object keys are unchanged by the migration — `creator-portfolio/<id>/videos/
 * <uuid>.mp4` is the same key in either bucket — so this only swaps the host
 * portion of URLs the application persisted alongside those keys.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY IT DISCOVERS COLUMNS INSTEAD OF LISTING THEM
 *
 * The obvious implementation enumerates the known columns (CreatorProfile.
 * introVideoUrl, CreatorPortfolioVideo.videoUrl, …). That is how you miss one.
 * `Brief.referenceLinks` is a free-form `string[]`, `NotificationEvent.vars`
 * holds arbitrary template variables, and `LegalPage.sections` is author-entered
 * rich content — any of them can contain a CDN URL that no column name hints at.
 * A URL left pointing at the old host keeps working right up until the old
 * bucket is deleted, so a miss here surfaces weeks later as broken media with no
 * obvious cause.
 *
 * So the script asks Postgres which columns could possibly hold one (every
 * text/varchar/json/jsonb column in `public`), and scans all of them. New
 * columns added later are covered automatically.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Safe to re-run. Only rows still containing the old host are touched, so a run
 * interrupted halfway is finished by running it again — no transaction wraps the
 * updates, deliberately, to avoid holding locks across every table at once.
 *
 * Usage (from server/):
 *   # dry run — reports what would change, writes nothing:
 *   OLD_CDN_BASE_URL=https://dXXXX.cloudfront.net \
 *   NEW_CDN_BASE_URL=https://cdn.gocollab.io \
 *   npm run prisma:rewrite:cdn-urls
 *
 *   # execute:
 *   REWRITE_CDN_APPLY=true \
 *   OLD_CDN_BASE_URL=https://dXXXX.cloudfront.net \
 *   NEW_CDN_BASE_URL=https://cdn.gocollab.io \
 *   npm run prisma:rewrite:cdn-urls
 *
 * Env:
 *   OLD_CDN_BASE_URL    required — the host currently stored (no trailing slash)
 *   NEW_CDN_BASE_URL    required — the host to store instead
 *   REWRITE_CDN_APPLY   "true" to execute; anything else is a dry run
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LOG_PREFIX = '[rewrite-cdn-urls]';

/** Column types that can hold a URL. Anything else cannot. */
const SCANNABLE_TYPES = ['text', 'character varying', 'json', 'jsonb'];

interface ColumnRef {
  table: string;
  column: string;
  dataType: string;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

/** Trailing slashes would double up against keys, which never start with one. */
function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/** Postgres identifier quoting. Names come from information_schema, not input,
 *  but PascalCase table names must be quoted regardless. */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function readApply(): boolean {
  return process.env.REWRITE_CDN_APPLY === 'true';
}

/**
 * Every column in `public` that could hold a URL, on real tables only.
 *
 * Views are excluded (not updatable), as are generated columns and Prisma's own
 * migration bookkeeping.
 */
async function discoverColumns(): Promise<ColumnRef[]> {
  const rows = await prisma.$queryRawUnsafe<
    { table_name: string; column_name: string; data_type: string }[]
  >(
    `SELECT c.table_name, c.column_name, c.data_type
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema = c.table_schema
        AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.is_generated = 'NEVER'
        AND c.data_type = ANY($1::text[])
        AND c.table_name NOT LIKE '\\_%'
      ORDER BY c.table_name, c.column_name`,
    SCANNABLE_TYPES,
  );

  return rows.map((r) => ({
    table: r.table_name,
    column: r.column_name,
    dataType: r.data_type,
  }));
}

/**
 * Rows in one column containing the old host.
 *
 * `::text` is a no-op on text/varchar and renders json/jsonb as its serialized
 * form, so one query shape covers every scannable type. `strpos` rather than
 * LIKE avoids having to escape `%` and `_` out of the host.
 */
async function countMatches(col: ColumnRef, oldUrl: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count
       FROM ${quoteIdent(col.table)}
      WHERE ${quoteIdent(col.column)} IS NOT NULL
        AND strpos(${quoteIdent(col.column)}::text, $1) > 0`,
    oldUrl,
  );
  return Number(rows[0]?.count ?? 0);
}

/**
 * Swap the host in one column.
 *
 * json/jsonb round-trips through text. The host only ever appears inside a JSON
 * string value, and neither host contains a character that needs JSON escaping,
 * so the document stays valid. Re-serialization may reorder jsonb keys and drop
 * insignificant whitespace — jsonb does not preserve either in the first place.
 */
async function rewriteColumn(
  col: ColumnRef,
  oldUrl: string,
  newUrl: string,
): Promise<number> {
  const ident = quoteIdent(col.column);
  const isJson = col.dataType === 'json' || col.dataType === 'jsonb';

  const setClause = isJson
    ? `${ident} = REPLACE(${ident}::text, $1, $2)::${col.dataType}`
    : `${ident} = REPLACE(${ident}, $1, $2)`;

  return prisma.$executeRawUnsafe(
    `UPDATE ${quoteIdent(col.table)}
        SET ${setClause}
      WHERE ${ident} IS NOT NULL
        AND strpos(${ident}::text, $1) > 0`,
    oldUrl,
    newUrl,
  );
}

async function main(): Promise<void> {
  const oldUrl = normalizeBaseUrl(requireEnv('OLD_CDN_BASE_URL'));
  const newUrl = normalizeBaseUrl(requireEnv('NEW_CDN_BASE_URL'));
  const apply = readApply();

  if (oldUrl === newUrl) {
    throw new Error('OLD_CDN_BASE_URL and NEW_CDN_BASE_URL are identical');
  }

  // If the new host contained the old one, a second run would rewrite its own
  // output ("a" -> "ab" -> "abb") and the script would stop being idempotent.
  if (newUrl.includes(oldUrl)) {
    throw new Error(
      `NEW_CDN_BASE_URL contains OLD_CDN_BASE_URL — rewriting would not be ` +
        `repeatable. Use hosts where neither is a substring of the other.`,
    );
  }

  console.log(`${LOG_PREFIX} ${oldUrl}  ->  ${newUrl}`);
  console.log(
    `${LOG_PREFIX} ${
      apply
        ? 'APPLY — the database WILL be written'
        : 'DRY RUN — no changes (set REWRITE_CDN_APPLY=true to execute)'
    }`,
  );

  const columns = await discoverColumns();
  console.log(`${LOG_PREFIX} scanning ${columns.length} columns`);

  const hits: { col: ColumnRef; rows: number }[] = [];
  for (const col of columns) {
    const rows = await countMatches(col, oldUrl);
    if (rows > 0) hits.push({ col, rows });
  }

  if (hits.length === 0) {
    console.log(
      `${LOG_PREFIX} no rows reference ${oldUrl} — nothing to do ` +
        `(already rewritten, or the old host is wrong)`,
    );
    return;
  }

  const totalRows = hits.reduce((sum, h) => sum + h.rows, 0);
  console.log(
    `${LOG_PREFIX} ${totalRows} row(s) across ${hits.length} column(s):`,
  );
  for (const { col, rows } of hits) {
    console.log(
      `${LOG_PREFIX}   ${col.table}.${col.column} (${col.dataType}) — ${rows}`,
    );
  }

  if (!apply) {
    console.log(
      `${LOG_PREFIX} dry run complete. Re-run with REWRITE_CDN_APPLY=true.`,
    );
    return;
  }

  let updated = 0;
  for (const { col } of hits) {
    const n = await rewriteColumn(col, oldUrl, newUrl);
    updated += n;
    console.log(`${LOG_PREFIX}   ${col.table}.${col.column} — ${n} updated`);
  }

  // Re-scan rather than trusting the UPDATE counts: anything still matching
  // means a column could not be rewritten, and the migration is not complete.
  const remaining: string[] = [];
  for (const { col } of hits) {
    if ((await countMatches(col, oldUrl)) > 0) {
      remaining.push(`${col.table}.${col.column}`);
    }
  }

  console.log(`${LOG_PREFIX} ${updated} row(s) updated`);
  if (remaining.length > 0) {
    throw new Error(
      `still referencing ${oldUrl}: ${remaining.join(', ')}. ` +
        `Re-run; if it persists these columns need manual inspection.`,
    );
  }
  console.log(`${LOG_PREFIX} verified: no rows reference ${oldUrl}`);
}

main()
  .catch((err) => {
    console.error(`${LOG_PREFIX} ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
