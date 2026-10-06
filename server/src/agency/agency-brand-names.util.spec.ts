import {
  appendAgencyBrandName,
  AgencyBrandNameConstraintError,
  MAX_AGENCY_BRAND_NAME_LENGTH,
} from './agency-brand-names.util';

describe('appendAgencyBrandName', () => {
  it('ignores blank names', () => {
    expect(appendAgencyBrandName(['GlowUp'], '   ')).toEqual(['GlowUp']);
  });

  it('treats matching names as the same regardless of case', () => {
    expect(appendAgencyBrandName(['GlowUp'], 'glowup')).toEqual(['GlowUp']);
  });

  it('appends a new unique name', () => {
    expect(appendAgencyBrandName(['GlowUp'], 'Blue Basin')).toEqual([
      'GlowUp',
      'Blue Basin',
    ]);
  });

  it('rejects names longer than the length cap', () => {
    const tooLong = 'x'.repeat(MAX_AGENCY_BRAND_NAME_LENGTH + 1);
    expect(() => appendAgencyBrandName([], tooLong)).toThrow(
      AgencyBrandNameConstraintError,
    );
  });
});
