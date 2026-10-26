import { randomInt as cryptoRandomInt } from 'node:crypto';
import {
  PARTNER_ID_PATTERN,
  generatePartnerId,
  normalizePartnerId,
} from './partner-id.util';

const realRandomInt = (maxExclusive: number) => cryptoRandomInt(maxExclusive);

describe('generatePartnerId', () => {
  it('produces a canonical GC-XXXX-XXXX code', () => {
    expect(generatePartnerId(realRandomInt)).toMatch(PARTNER_ID_PATTERN);
  });

  it('never emits the ambiguous characters I, L, O or U', () => {
    // Walk the whole alphabet deterministically rather than trusting that a
    // random sample happens to cover the excluded letters.
    let next = 0;
    const cycling = (maxExclusive: number) => {
      const value = next % maxExclusive;
      next += 1;
      return value;
    };

    for (let i = 0; i < 200; i += 1) {
      expect(generatePartnerId(cycling)).not.toMatch(/[ILOU]/);
    }
  });

  it('draws every character from the generator', () => {
    const draws: number[] = [];
    generatePartnerId((maxExclusive) => {
      draws.push(maxExclusive);
      return 0;
    });
    expect(draws).toHaveLength(8);
    expect(new Set(draws)).toEqual(new Set([32]));
  });

  it('generates codes that round-trip through normalization', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generatePartnerId(realRandomInt);
      expect(normalizePartnerId(code)).toBe(code);
    }
  });
});

describe('normalizePartnerId', () => {
  it('uppercases a lowercase code', () => {
    expect(normalizePartnerId('gc-7f3k-92qx')).toBe('GC-7F3K-92QX');
  });

  it('accepts a code with the dashes dropped', () => {
    expect(normalizePartnerId('GC7F3K92QX')).toBe('GC-7F3K-92QX');
  });

  it('tolerates surrounding whitespace and stray copy-paste punctuation', () => {
    expect(normalizePartnerId('  GC-7F3K-92QX  ')).toBe('GC-7F3K-92QX');
    expect(normalizePartnerId('GC–7F3K–92QX')).toBe('GC-7F3K-92QX');
    expect(normalizePartnerId('GC 7F3K 92QX')).toBe('GC-7F3K-92QX');
  });

  it('strips zero-width characters pasted from a chat client', () => {
    expect(normalizePartnerId('GC-7F3K​-92QX')).toBe('GC-7F3K-92QX');
  });

  it.each([null, undefined, '', '   '])('returns null for %p', (input) => {
    expect(normalizePartnerId(input)).toBeNull();
  });

  it('rejects a code carrying an excluded character', () => {
    // I is not in the alphabet, so this can never be a real code.
    expect(normalizePartnerId('GC-7I3K-92QX')).toBeNull();
  });

  it('rejects wrong lengths', () => {
    expect(normalizePartnerId('GC-7F3K-92Q')).toBeNull();
    expect(normalizePartnerId('GC-7F3K-92QXX')).toBeNull();
  });

  it('rejects a wrong prefix', () => {
    expect(normalizePartnerId('XY-7F3K-92QX')).toBeNull();
  });

  it('does not match a code embedded in a longer string', () => {
    // Guards against an unanchored pattern accepting junk around the code.
    expect(normalizePartnerId('prefixGC-7F3K-92QXsuffix')).toBeNull();
  });
});
