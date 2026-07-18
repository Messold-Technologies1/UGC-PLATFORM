import { ApiProperty } from '@nestjs/swagger';

/**
 * How many building-stage profiles are missing a single Go-Live requirement.
 * One entry per requirement in the checklist (see `GO_LIVE_REQUIREMENTS`).
 */
export class BuildingProfileFieldStatDto {
  @ApiProperty({
    example: 'portfolioVideos',
    description: 'Stable machine key for the requirement.',
  })
  key!: string;

  @ApiProperty({
    example: 'At least 3 portfolio videos',
    description: 'Human-readable label for the requirement.',
  })
  label!: string;

  @ApiProperty({
    example: 60,
    description: 'Number of building-stage profiles missing this field.',
  })
  incompleteCount!: number;

  @ApiProperty({
    example: 48,
    description:
      'Share of building-stage profiles missing this field, 0-100 (rounded).',
  })
  percentage!: number;
}

/**
 * Aggregate view of which Go-Live fields are still incomplete across every
 * profile that is still building (completeProfile = false, i.e. the admin
 * "Building profile" segment).
 */
export class AdminBuildingProfileAnalyticsDto {
  @ApiProperty({
    example: 125,
    description: 'Total profiles still building (the analytics denominator).',
  })
  totalProfiles!: number;

  @ApiProperty({
    type: [BuildingProfileFieldStatDto],
    description: 'Per-field incomplete counts, most-missing first.',
  })
  fields!: BuildingProfileFieldStatDto[];
}
