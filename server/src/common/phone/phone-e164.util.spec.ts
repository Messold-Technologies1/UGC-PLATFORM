import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import {
  classifyPhoneRepair,
  IsE164Phone,
  isCanonicalE164,
  isValidE164,
  NormalizeE164Phone,
  normalizeE164,
} from './phone-e164.util';

describe('normalizeE164', () => {
  it('passes a well-formed number through unchanged', () => {
    expect(normalizeE164('+918122064860')).toBe('+918122064860');
    expect(normalizeE164('+12025550123')).toBe('+12025550123');
    expect(normalizeE164('+447123456789')).toBe('+447123456789');
  });

  it('strips a national trunk prefix left after the country code', () => {
    // The bug this util exists for: `+91` + the `0` every Indian number is
    // printed with + the ten real digits. 13 digits, so the old regex passed
    // it, and WhatsApp delivered to it, so it reached a verified state.
    expect(normalizeE164('+9108122064860')).toBe('+918122064860');
  });

  it('ignores spaces, dashes and brackets', () => {
    expect(normalizeE164('+91 81220-64860')).toBe('+918122064860');
    expect(normalizeE164('  +1 (202) 555-0123  ')).toBe('+12025550123');
  });

  it('rejects a number that is not dialable', () => {
    expect(normalizeE164('+91812206486')).toBeNull(); // one digit short
    expect(normalizeE164('+910000000000')).toBeNull(); // no such range
    expect(normalizeE164('+9100008122064860')).toBeNull(); // too many zeros
    expect(normalizeE164('+999999999999')).toBeNull(); // no such country
    expect(normalizeE164('+440712345678')).toBeNull(); // GB trunk prefix
  });

  it('rejects input with no country code, which cannot be resolved', () => {
    expect(normalizeE164('08122064860')).toBeNull();
    expect(normalizeE164('8122064860')).toBeNull();
  });

  it('rejects empty and non-string input', () => {
    expect(normalizeE164('')).toBeNull();
    expect(normalizeE164('   ')).toBeNull();
    expect(normalizeE164('+')).toBeNull();
    expect(normalizeE164(null)).toBeNull();
    expect(normalizeE164(undefined)).toBeNull();
    expect(normalizeE164(919876543210)).toBeNull();
  });
});

describe('isValidE164 / isCanonicalE164', () => {
  it('treats a repairable number as valid but not canonical', () => {
    expect(isValidE164('+9108122064860')).toBe(true);
    expect(isCanonicalE164('+9108122064860')).toBe(false);
  });

  it('treats an already-canonical number as both', () => {
    expect(isValidE164('+918122064860')).toBe(true);
    expect(isCanonicalE164('+918122064860')).toBe(true);
  });

  it('treats an unparseable number as neither', () => {
    expect(isValidE164('+91812206486')).toBe(false);
    expect(isCanonicalE164('+91812206486')).toBe(false);
  });
});

describe('DTO decorators', () => {
  class PhoneDto {
    @NormalizeE164Phone()
    @IsE164Phone()
    phone!: string;
  }

  const build = (phone: unknown): PhoneDto =>
    plainToInstance(PhoneDto, { phone });

  it('canonicalizes before validating, so the stored value is correct', () => {
    const dto = build('+9108122064860');
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.phone).toBe('+918122064860');
  });

  it('accepts an already-canonical number', () => {
    const dto = build('+918122064860');
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.phone).toBe('+918122064860');
  });

  it('rejects a number that cannot be dialed', () => {
    const errors = validateSync(build('+91812206486'));
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isE164Phone');
  });

  it('reports the problem rather than silently nulling a bad value', () => {
    const dto = build('not a phone');
    expect(validateSync(dto)).toHaveLength(1);
    expect(dto.phone).toBe('not a phone');
  });
});

describe('classifyPhoneRepair', () => {
  // Synthetic numbers throughout. Real values from the production audit are
  // personal data and do not belong in the repository.

  it('leaves an already-canonical number alone', () => {
    expect(classifyPhoneRepair('+919876543210')).toEqual({
      kind: 'canonical',
      to: '+919876543210',
    });
  });

  it('normalizes a national trunk prefix with no inference', () => {
    expect(classifyPhoneRepair('+9109876543210')).toEqual({
      kind: 'normalized',
      to: '+919876543210',
    });
  });

  it('normalizes formatting noise', () => {
    expect(classifyPhoneRepair('+91 98765-43210')).toEqual({
      kind: 'normalized',
      to: '+919876543210',
    });
  });

  it('recovers a country code that was entered twice', () => {
    expect(classifyPhoneRepair('+91919876543210')).toEqual({
      kind: 'recovered',
      to: '+919876543210',
    });
  });

  it('never shortens a number that is already valid', () => {
    // The safety property behind the `recovered` rule. These digits do begin
    // with 91 twice, but the value parses as a real number, so it must come
    // back untouched rather than be cut down.
    expect(classifyPhoneRepair('+919198765432')).toEqual({
      kind: 'canonical',
      to: '+919198765432',
    });
  });

  it('gives up on numbers no rule can interpret', () => {
    for (const junk of ['+919999999', '+9143434343', '+1']) {
      expect(classifyPhoneRepair(junk)).toEqual({
        kind: 'unrecoverable',
        to: null,
      });
    }
  });
});
