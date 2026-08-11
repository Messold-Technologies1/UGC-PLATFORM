import { CreatorFacetDimension, CreatorGender } from '@prisma/client';
import {
  evaluateProfileCompleteness,
  GO_LIVE_REQUIREMENTS,
  MIN_PORTFOLIO_VIDEOS,
  REQUIRED_FACET_DIMENSIONS,
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
    languageCount: 1,
    packageCount: 1,
    publicVideoCount: MIN_PORTFOLIO_VIDEOS,
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

  it('requires the creator category facet', () => {
    const result = evaluateProfileCompleteness({
      ...completeInput(),
      selectedFacetDimensions: [CreatorFacetDimension.OCCUPATION],
    });
    expect(result.complete).toBe(false);
    // The required category is missing; a selected optional dimension is fine.
    expect(result.missing).toContain("Creator's category");
  });

  it('requires exactly the creator category facet', () => {
    expect(REQUIRED_FACET_DIMENSIONS).toEqual([
      CreatorFacetDimension.CONTENT_CATEGORY,
    ]);
  });

  it('does not require any facet dimension other than creator category', () => {
    for (const dimension of [
      CreatorFacetDimension.CONTENT_FORMAT,
      CreatorFacetDimension.CATEGORY_EXPERIENCE,
      CreatorFacetDimension.APPEARANCE,
      CreatorFacetDimension.CONTENT_STYLE,
      CreatorFacetDimension.CAPABILITY,
      CreatorFacetDimension.OCCUPATION,
      CreatorFacetDimension.CAN_CREATE_WITH,
      CreatorFacetDimension.LIFE_STYLE,
      CreatorFacetDimension.AI_CONTENT_PERMISSION,
      CreatorFacetDimension.CREATOR_TYPE,
    ]) {
      expect(REQUIRED_FACET_DIMENSIONS).not.toContain(dimension);
    }
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
      languageCount: 0,
      packageCount: 0,
      publicVideoCount: 0,
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
