import {
  brandProfileCompleteness,
  normalizePhone,
  ownerPhoneVerified,
  phonesMatch,
} from './brand-profile-completeness.util';

const completeProfile = {
  brandName: 'Acme',
  contactFullName: 'Jane Doe',
  contactPhone: '+91 98765 43210',
};

const verifiedUser = {
  phone: '+91 98765 43210',
  phoneVerified: true,
  phoneOtpLastStatus: 'approved',
};

describe('normalizePhone', () => {
  it('strips spacing so the same number compares equal', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210');
  });

  it.each([null, undefined, '', '   '])('returns null for %p', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe('phonesMatch', () => {
  it('matches the same number written with different spacing', () => {
    expect(phonesMatch('+91 98765 43210', '+919876543210')).toBe(true);
  });

  it('does not match different numbers', () => {
    expect(phonesMatch('+919876543210', '+919999999999')).toBe(false);
  });

  it('never matches when either side is missing', () => {
    // Guards the old `Boolean(a) && Boolean(b)` shape: two absent numbers must
    // not count as "the same number".
    expect(phonesMatch(null, null)).toBe(false);
    expect(phonesMatch('+919876543210', null)).toBe(false);
    expect(phonesMatch(null, '+919876543210')).toBe(false);
  });
});

describe('ownerPhoneVerified', () => {
  it('needs both the flag and the approved OTP status', () => {
    expect(ownerPhoneVerified(verifiedUser)).toBe(true);
    expect(ownerPhoneVerified({ ...verifiedUser, phoneVerified: false })).toBe(
      false,
    );
    expect(
      ownerPhoneVerified({ ...verifiedUser, phoneOtpLastStatus: 'pending' }),
    ).toBe(false);
    expect(
      ownerPhoneVerified({ ...verifiedUser, phoneOtpLastStatus: null }),
    ).toBe(false);
  });
});

describe('brandProfileCompleteness', () => {
  it('accepts a complete, verified profile', () => {
    expect(
      brandProfileCompleteness({
        profile: completeProfile,
        user: verifiedUser,
        otpRequired: true,
      }),
    ).toEqual({ complete: true, gaps: [] });
  });

  it.each([
    ['brandName', 'BRAND_NAME_MISSING'],
    ['contactFullName', 'CONTACT_NAME_MISSING'],
    ['contactPhone', 'CONTACT_PHONE_MISSING'],
  ])('reports %s as %s', (field, gap) => {
    const result = brandProfileCompleteness({
      profile: { ...completeProfile, [field]: null },
      user: verifiedUser,
      otpRequired: true,
    });
    expect(result.complete).toBe(false);
    expect(result.gaps).toContain(gap);
  });

  it('treats whitespace-only values as missing', () => {
    const result = brandProfileCompleteness({
      profile: { ...completeProfile, brandName: '   ' },
      user: verifiedUser,
      otpRequired: true,
    });
    expect(result.gaps).toContain('BRAND_NAME_MISSING');
  });

  it('reports every gap at once rather than stopping at the first', () => {
    const result = brandProfileCompleteness({
      profile: { brandName: null, contactFullName: null, contactPhone: null },
      user: { phoneVerified: false, phoneOtpLastStatus: null },
      otpRequired: true,
    });
    expect(result.gaps).toEqual([
      'BRAND_NAME_MISSING',
      'CONTACT_NAME_MISSING',
      'CONTACT_PHONE_MISSING',
      'PHONE_NOT_VERIFIED',
    ]);
  });

  it('reports an unverified phone when OTP is required', () => {
    const result = brandProfileCompleteness({
      profile: completeProfile,
      user: { ...verifiedUser, phoneVerified: false },
      otpRequired: true,
    });
    expect(result.complete).toBe(false);
    expect(result.gaps).toEqual(['PHONE_NOT_VERIFIED']);
  });

  it('still blocks when phoneVerified is set but the OTP status is not approved', () => {
    const result = brandProfileCompleteness({
      profile: completeProfile,
      user: { ...verifiedUser, phoneOtpLastStatus: 'pending' },
      otpRequired: true,
    });
    expect(result.gaps).toEqual(['PHONE_NOT_VERIFIED']);
  });

  // The two regressions that would lock real brands out.

  it('allows a contact phone that differs from the login phone', () => {
    // No flow exists to OTP a number other than the login phone, so demanding
    // they match would permanently block any brand using a separate business
    // line. A verified owner is what the gate actually cares about.
    const result = brandProfileCompleteness({
      profile: { ...completeProfile, contactPhone: '+91 11111 11111' },
      user: verifiedUser,
      otpRequired: true,
    });
    expect(result).toEqual({ complete: true, gaps: [] });
  });

  it('skips the OTP rule entirely when OTP is disabled platform-wide', () => {
    // PHONE_OTP_ENABLED=false makes signup write phoneVerified: false for
    // everyone; an unconditional check would block every brand, staging too.
    const result = brandProfileCompleteness({
      profile: completeProfile,
      user: { phoneVerified: false, phoneOtpLastStatus: null },
      otpRequired: false,
    });
    expect(result).toEqual({ complete: true, gaps: [] });
  });

  it('still enforces the field checks when OTP is disabled', () => {
    const result = brandProfileCompleteness({
      profile: { ...completeProfile, brandName: null },
      user: { phoneVerified: false, phoneOtpLastStatus: null },
      otpRequired: false,
    });
    expect(result.gaps).toEqual(['BRAND_NAME_MISSING']);
  });

  it('ignores fields that are deliberately optional', () => {
    // Logo, contactEmail, website, productType and categories are all absent.
    expect(
      brandProfileCompleteness({
        profile: completeProfile,
        user: verifiedUser,
        otpRequired: true,
      }).complete,
    ).toBe(true);
  });
});
