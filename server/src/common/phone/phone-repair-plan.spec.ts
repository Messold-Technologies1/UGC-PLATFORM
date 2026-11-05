import {
  planContactPhoneRepairs,
  planIdentityPhoneRepairs,
} from './phone-repair-plan';

// Synthetic numbers throughout. Real values from the production audit are
// personal data and do not belong in the repository.
const CANONICAL = '+919876543210';
const TRUNK_ZERO = '+9109876543210'; // same number, national trunk prefix
const DOUBLE_CC = '+91919876543210'; // same number, country code typed twice
const OTHER = '+918123456789';
const OTHER_TRUNK_ZERO = '+9108123456789';

const SAFE = { includeRecovered: false };
const ALL = { includeRecovered: true };

describe('planIdentityPhoneRepairs', () => {
  it('plans a plain normalization', () => {
    expect(
      planIdentityPhoneRepairs([{ id: 'u1', phone: TRUNK_ZERO }], SAFE),
    ).toEqual([
      { id: 'u1', from: TRUNK_ZERO, to: CANONICAL, kind: 'normalized' },
    ]);
  });

  it('ignores rows that are already canonical, and empty rows', () => {
    expect(
      planIdentityPhoneRepairs(
        [
          { id: 'u1', phone: CANONICAL },
          { id: 'u2', phone: null },
          { id: 'u3', phone: '   ' },
        ],
        SAFE,
      ),
    ).toEqual([]);
  });

  it('holds back the inferred class unless asked', () => {
    const [row] = planIdentityPhoneRepairs(
      [{ id: 'u1', phone: DOUBLE_CC }],
      SAFE,
    );
    expect(row.kind).toBe('recovered');
    expect(row.skipped).toBe('needs --include-recovered');

    const [allowed] = planIdentityPhoneRepairs(
      [{ id: 'u1', phone: DOUBLE_CC }],
      ALL,
    );
    expect(allowed.skipped).toBeUndefined();
    expect(allowed.to).toBe(CANONICAL);
  });

  it('refuses a rewrite onto a number another account already holds', () => {
    // u2 is already the canonical number. Repairing u1 would put both
    // accounts on it, and User.phone has no unique constraint to stop that.
    const [row] = planIdentityPhoneRepairs(
      [
        { id: 'u1', phone: TRUNK_ZERO },
        { id: 'u2', phone: CANONICAL },
      ],
      SAFE,
    );
    expect(row.id).toBe('u1');
    expect(row.skipped).toBe('collides with u2');
  });

  it('refuses two broken rows that would converge on one number', () => {
    // Neither holds the canonical form yet, so the clash only shows up
    // against the planned end state.
    const planned = planIdentityPhoneRepairs(
      [
        { id: 'u1', phone: TRUNK_ZERO },
        { id: 'u2', phone: DOUBLE_CC },
      ],
      ALL,
    );
    expect(planned).toHaveLength(2);
    for (const row of planned) {
      expect(row.skipped).toMatch(/^collides with/);
    }
  });

  it('does not treat a held-back row as a collision', () => {
    // u2 is `recovered` and not being written under SAFE, so it stays on its
    // broken value and must not block u1 from taking the canonical one.
    const planned = planIdentityPhoneRepairs(
      [
        { id: 'u1', phone: TRUNK_ZERO },
        { id: 'u2', phone: DOUBLE_CC },
      ],
      SAFE,
    );
    const u1 = planned.find((p) => p.id === 'u1');
    expect(u1?.skipped).toBeUndefined();
    expect(u1?.to).toBe(CANONICAL);
  });

  it('repairs unrelated numbers independently', () => {
    const planned = planIdentityPhoneRepairs(
      [
        { id: 'u1', phone: TRUNK_ZERO },
        { id: 'u2', phone: OTHER_TRUNK_ZERO },
      ],
      SAFE,
    );
    expect(planned.map((p) => [p.id, p.to, p.skipped])).toEqual([
      ['u1', CANONICAL, undefined],
      ['u2', OTHER, undefined],
    ]);
  });

  it('reports a number no rule can interpret, and writes nothing for it', () => {
    const [row] = planIdentityPhoneRepairs(
      [{ id: 'u1', phone: '+919999999' }],
      ALL,
    );
    expect(row).toMatchObject({
      kind: 'unrecoverable',
      to: '',
      skipped: 'unrecoverable',
    });
  });

  it('is idempotent — a repaired set plans nothing on a second pass', () => {
    const first = planIdentityPhoneRepairs(
      [{ id: 'u1', phone: TRUNK_ZERO }],
      SAFE,
    );
    const after = first.map((p) => ({ id: p.id, phone: p.to }));
    expect(planIdentityPhoneRepairs(after, SAFE)).toEqual([]);
  });
});

describe('planContactPhoneRepairs', () => {
  it('allows two contacts to share a number', () => {
    // Not an identity column, so convergence is legitimate.
    const planned = planContactPhoneRepairs(
      [
        { id: 'b1', phone: TRUNK_ZERO },
        { id: 'b2', phone: CANONICAL },
      ],
      SAFE,
    );
    expect(planned).toEqual([
      { id: 'b1', from: TRUNK_ZERO, to: CANONICAL, kind: 'normalized' },
    ]);
  });

  it('still holds back the inferred class', () => {
    const [row] = planContactPhoneRepairs(
      [{ id: 'b1', phone: DOUBLE_CC }],
      SAFE,
    );
    expect(row.skipped).toBe('needs --include-recovered');
  });
});
