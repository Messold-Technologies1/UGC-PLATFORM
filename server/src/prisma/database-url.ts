import type { ConfigService } from '@nestjs/config';

/** Normalize postgres:// for URL parsing (Prisma accepts both schemes). */
function toParseablePostgresUrl(raw: string): string {
  return raw.replace(/^postgres:\/\//i, 'postgresql://');
}

/** Restore scheme Prisma/pg expect when the input used postgres:// */
function restorePostgresScheme(original: string, parsed: URL): string {
  if (/^postgres:\/\//i.test(original)) {
    return `postgres://${parsed.host}${parsed.pathname}${parsed.search}`;
  }
  return parsed.toString();
}

export type RuntimeDatabaseUrlOptions = {
  baseUrl: string;
  connectionLimit: number;
  poolTimeoutSeconds: number;
  connectTimeoutSeconds: number;
  queryTimeoutSeconds: number;
  /** Force PgBouncer compatibility params (auto-detected when host contains `-pooler`). */
  pgbouncer?: boolean;
};

/**
 * Apply Prisma pool / timeout query params on top of DATABASE_URL.
 * Safe to call repeatedly; overwrites the same keys if already present.
 */
export function buildRuntimeDatabaseUrl(
  options: RuntimeDatabaseUrlOptions,
): string {
  const original = options.baseUrl.trim();
  const parsed = new URL(toParseablePostgresUrl(original));

  parsed.searchParams.set(
    'connection_limit',
    String(options.connectionLimit),
  );
  parsed.searchParams.set('pool_timeout', String(options.poolTimeoutSeconds));
  parsed.searchParams.set(
    'connect_timeout',
    String(options.connectTimeoutSeconds),
  );
  parsed.searchParams.set(
    'socket_timeout',
    String(options.queryTimeoutSeconds),
  );

  const usePgBouncer =
    options.pgbouncer ?? parsed.hostname.includes('-pooler');
  if (usePgBouncer) {
    parsed.searchParams.set('pgbouncer', 'true');
  }

  return restorePostgresScheme(original, parsed);
}

export function runtimeDatabaseUrlFromConfig(
  config: ConfigService,
): string {
  return buildRuntimeDatabaseUrl({
    baseUrl: config.getOrThrow<string>('DATABASE_URL'),
    connectionLimit: config.get<number>('DATABASE_CONNECTION_LIMIT', 5),
    poolTimeoutSeconds: config.get<number>('DATABASE_POOL_TIMEOUT_SECONDS', 15),
    connectTimeoutSeconds: config.get<number>(
      'DATABASE_CONNECT_TIMEOUT_SECONDS',
      10,
    ),
    queryTimeoutSeconds: Math.ceil(
      config.get<number>('DATABASE_QUERY_TIMEOUT_MS', 30_000) / 1000,
    ),
    pgbouncer: config.get<string>('DATABASE_PGBOUNCER') === 'true'
      ? true
      : config.get<string>('DATABASE_PGBOUNCER') === 'false'
        ? false
        : undefined,
  });
}
