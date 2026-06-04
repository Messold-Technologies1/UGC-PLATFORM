import { buildRuntimeDatabaseUrl } from './database-url';

describe('buildRuntimeDatabaseUrl', () => {
  it('adds pool and timeout params for Neon pooler hosts', () => {
    const url = buildRuntimeDatabaseUrl({
      baseUrl:
        'postgresql://user:pass@ep-abc-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
      connectionLimit: 5,
      poolTimeoutSeconds: 15,
      connectTimeoutSeconds: 10,
      queryTimeoutSeconds: 30,
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('connection_limit')).toBe('5');
    expect(parsed.searchParams.get('pool_timeout')).toBe('15');
    expect(parsed.searchParams.get('connect_timeout')).toBe('10');
    expect(parsed.searchParams.get('socket_timeout')).toBe('30');
    expect(parsed.searchParams.get('pgbouncer')).toBe('true');
    expect(parsed.hostname).toContain('-pooler');
  });

  it('preserves postgres:// scheme', () => {
    const url = buildRuntimeDatabaseUrl({
      baseUrl: 'postgres://user:pass@localhost/db',
      connectionLimit: 3,
      poolTimeoutSeconds: 5,
      connectTimeoutSeconds: 5,
      queryTimeoutSeconds: 10,
      pgbouncer: false,
    });

    expect(url.startsWith('postgres://')).toBe(true);
    expect(url).toContain('connection_limit=3');
  });
});
