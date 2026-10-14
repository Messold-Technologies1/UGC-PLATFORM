import { rejectFacetTextShape } from './facet-other-shape';

describe('rejectFacetTextShape', () => {
  it('accepts the shapes real catalog options have', () => {
    for (const label of [
      'midsize',
      'slim / lean',
      'plus size / curvy',
      'athletic / fit',
      'individual / solo',
      'muscle monster',
      'kid influencer',
      'tall & slim',
    ]) {
      expect(rejectFacetTextShape(label)).toBeNull();
    }
  });

  it('rejects a name paired with values — the one that got through', () => {
    expect(rejectFacetTextShape('vaishnavi (midsize) manish (athletic)')).toBe(
      'brackets',
    );
  });

  it('rejects notes and sentences', () => {
    expect(rejectFacetTextShape('i am athletic, my wife is midsize')).toBe(
      'punctuation',
    );
    expect(
      rejectFacetTextShape('we are a couple who shoot together at home'),
    ).toBe('too_long');
  });

  it('rejects ages, heights and anything else numeric', () => {
    expect(rejectFacetTextShape('athletic 5ft 9')).toBe('digits');
  });

  it('rejects two values joined together', () => {
    expect(rejectFacetTextShape('athletic and midsize and slim')).toBe(
      'multiple_values',
    );
  });

  it('rejects empty text', () => {
    expect(rejectFacetTextShape('   ')).toBe('too_long');
  });
});
