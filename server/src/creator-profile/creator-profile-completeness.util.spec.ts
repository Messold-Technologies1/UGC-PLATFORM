import { CreatorFacetDimension, CreatorGender } from '@prisma/client';
import {
  evaluateProfileCompleteness,
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

  it('requires every mandatory facet dimension', () => {
    const result = evaluateProfileCompleteness({
      ...completeInput(),
      selectedFacetDimensions: [CreatorFacetDimension.CONTENT_FORMAT],
    });
    expect(result.complete).toBe(false);
    // All required dimensions except the one selected should be reported.
    expect(result.missing).toContain('Appearance');
    expect(result.missing).toContain('Occupation');
    expect(result.missing).not.toContain('Content format');
  });

  it('does not require LIFE_STYLE or AI_CONTENT_PERMISSION', () => {
    expect(REQUIRED_FACET_DIMENSIONS).not.toContain(
      CreatorFacetDimension.LIFE_STYLE,
    );
    expect(REQUIRED_FACET_DIMENSIONS).not.toContain(
      CreatorFacetDimension.AI_CONTENT_PERMISSION,
    );
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
