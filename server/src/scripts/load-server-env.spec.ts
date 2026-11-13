import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadServerEnv } from './load-server-env';

describe('loadServerEnv', () => {
  const dir = mkdtempSync(join(tmpdir(), 'envtest-'));
  const write = (name: string, body: string) => {
    const p = join(dir, name);
    writeFileSync(p, body);
    return p;
  };

  afterEach(() => {
    for (const k of [
      'T_PLAIN',
      'T_QUOTED',
      'T_SINGLE',
      'T_EXPORTED',
      'T_URL',
    ]) {
      delete process.env[k];
    }
  });

  it('reads plain, quoted and exported values', () => {
    const f = write(
      'a.env',
      [
        '# a comment',
        '',
        'T_PLAIN=one',
        'T_QUOTED="two"',
        "T_SINGLE='three'",
        'export T_EXPORTED=four',
      ].join('\n'),
    );

    expect(loadServerEnv(f)).toBe(f);
    expect(process.env.T_PLAIN).toBe('one');
    expect(process.env.T_QUOTED).toBe('two');
    expect(process.env.T_SINGLE).toBe('three');
    expect(process.env.T_EXPORTED).toBe('four');
  });

  it('keeps the = inside a connection string', () => {
    // The whole reason this exists -- a Postgres URL is full of = and ?.
    const url = 'postgresql://u:p@h:5432/db?schema=public&sslmode=require';
    const f = write('b.env', `T_URL=${url}`);

    loadServerEnv(f);
    expect(process.env.T_URL).toBe(url);
  });

  it('never overrides a value already in the environment', () => {
    // So `DATABASE_URL=... npm run script` still points where you aimed it.
    process.env.T_PLAIN = 'from the command line';
    const f = write('c.env', 'T_PLAIN=from the file');

    loadServerEnv(f);
    expect(process.env.T_PLAIN).toBe('from the command line');
  });

  it('does nothing when the file is absent', () => {
    expect(loadServerEnv(join(dir, 'nope.env'))).toBeNull();
  });
});
