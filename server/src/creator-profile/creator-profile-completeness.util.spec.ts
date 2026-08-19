import { CreatorFacetDimension, CreatorGender } from '@prisma/client';
import {
  evaluateProfileCompleteness,
  GO_LIVE_REQUIREMENTS,
  MIN_PORTFOLIO_VIDEOS,
  REQUIRED_FACET_DIMENSIONS,
  REQUIRED_SECONDARY_NICHES,
  type ProfileCompletenessInput,
} from './creator-profile-completeness.util';

function completeInput(): ProfileCompletenessInput {
  return {
    profileImageUrl: 'https://cdn/img.jpg',
    introVideoUrl: 'https://cdn/intro.mp4',
    displayName: 'Jane Doe',
    contactEmail: 'jane@example.com',
    bio: 'I make great content.',
    countryName: 'India',
    stateName: 'Karnataka',
    city: 'Bengaluru',
    gender: CreatorGender.FEMALE,
    dateOfBirth: new Date('1995-04-15'),
    shippingAddress: '221B Baker Street',
    selectedFacetDimensions: [...REQUIRED_FACET_DIMENSIONS],
    nichePrimaryCount: 1,
    nicheSecondaryCount: REQUIRED_SECONDARY_NICHES,
    restrictionCount: 1,
    languageCount: 1,
    packageCount: 1,
    publicVideoCount: MIN_PORTFOLIO_VIDEOS,
    mandatoryAddOnsPriced: true,
    instagramConnected: true,
  };
}

describe('evaluateProfileCompleteness', () => {
  it('is complete when every requirement is met', () => {
    const result = evaluateProfileCompleteness(completeInput());
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('treats blank strings as missing', () => {
    const result = evaluateProfileCompleteness({
      ...completeInput(),
      bio: '   ',
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Bio');
  });

  it('requires a primary niche and exactly two secondary niches', () => {
    const noPrimary = evaluateProfileCompleteness({
      ...completeInput(),
      nichePrimaryCount: 0,
    });
    expect(noPrimary.complete).toBe(false);
    expect(noPrimary.missing).toContain('Primary niche');

    const tooFewSecondary = evaluateProfileCompleteness({
      ...completeInput(),
      nicheSecondaryCount: 1,
    });
    expect(tooFewSecondary.complete).toBe(false);
    expect(tooFewSecondary.missing).toContain(
      `${REQUIRED_SECONDARY_NICHES} secondary niches`,
    );
  });

  it('requires creator type, occupation and appearance', () => {
    const result = evaluateProfileCompleteness({
      ...completeInput(),
      selectedFacetDimensions: [CreatorFacetDimension.CREATOR_TYPE],
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Occupation');
    expect(result.missing).toContain('Appearance');
    expect(result.missing).not.toContain('Creator type');
  });

  it('requires the three single-select identity facets', () => {
    expect(REQUIRED_FACET_DIMENSIONS).toEqual([
      CreatorFacetDimension.CREATOR_TYPE,
      CreatorFacetDimension.OCCUPATION,
      CreatorFacetDimension.APPEARANCE,
    ]);
  });

  it('requires at least one "Open to" opt-in', () => {
    const result = evaluateProfileCompleteness({
      ...completeInput(),
      restrictionCount: 0,
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('At least one "Open to" option');
  });

  it('requires at least three portfolio videos', () => {
    const result = evaluateProfileCompleteness({
      ...completeInput(),
      publicVideoCount: 2,
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain(
      `At least ${MIN_PORTFOLIO_VIDEOS} portfolio videos`,
    );
  });

  it('does not require content volume, social links, on-location or travel radius', () => {
    // completeInput already omits those; assert it stays complete.
    const result = evaluateProfileCompleteness(completeInput());
    expect(result.complete).toBe(true);
  });

  it('requires at least one language and one package', () => {
    const result = evaluateProfileCompleteness({
      ...completeInput(),
      languageCount: 0,
      packageCount: 0,
    });
    expect(result.missing).toContain('At least one language');
    expect(result.missing).toContain('At least one package');
  });

  it('requires mandatory add-ons to be priced', () => {
    const result = evaluateProfileCompleteness({
      ...completeInput(),
      mandatoryAddOnsPriced: false,
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Priced mandatory add-ons');
  });

  it('requires an Instagram connection', () => {
    const result = evaluateProfileCompleteness({
      ...completeInput(),
      instagramConnected: false,
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Instagram connected');
  });
});

describe('GO_LIVE_REQUIREMENTS catalog', () => {
  it('has a stable entry for every label a fully-empty profile reports', () => {
    // The building-profile analytics tally `missing` labels back to catalog
    // keys, so every label the evaluator can emit must exist in the catalog.
    const emptyProfile = evaluateProfileCompleteness({
      profileImageUrl: null,
      introVideoUrl: null,
      displayName: null,
      contactEmail: null,
      bio: null,
      countryName: null,
      stateName: null,
      city: null,
      gender: null,
      dateOfBirth: null,
      shippingAddress: null,
      selectedFacetDimensions: [],
      nichePrimaryCount: 0,
      nicheSecondaryCount: 0,
      restrictionCount: 0,
      languageCount: 0,
      packageCount: 0,
      publicVideoCount: 0,
      mandatoryAddOnsPriced: false,
      instagramConnected: false,
    });

    const catalogLabels = new Set(GO_LIVE_REQUIREMENTS.map((r) => r.label));
    for (const label of emptyProfile.missing) {
      expect(catalogLabels.has(label)).toBe(true);
    }
    // Every requirement should surface for a completely empty profile.
    expect(emptyProfile.missing.length).toBe(GO_LIVE_REQUIREMENTS.length);
  });

  it('uses unique keys', () => {
    const keys = GO_LIVE_REQUIREMENTS.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
