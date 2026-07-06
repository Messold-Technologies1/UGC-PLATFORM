import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialConnectionStatus, SocialPlatform } from '@prisma/client';

/** A single ranked demographic bucket, e.g. { key: "Mumbai, Maharashtra", value: 800, share: 0.12 }. */
export class DemographicBucketDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  value!: number;

  @ApiPropertyOptional({
    description: 'Fraction of the total (0..1), when known.',
  })
  share?: number;
}

/** Derived audience view for a connection (top-N computed from stored maps). */
export class SocialAudienceDto {
  @ApiPropertyOptional()
  snapshotDate?: string;

  @ApiPropertyOptional()
  followerCount?: number;

  @ApiProperty({ type: [DemographicBucketDto] })
  ageRanges!: DemographicBucketDto[];

  @ApiProperty({ type: [DemographicBucketDto] })
  gender!: DemographicBucketDto[];

  @ApiProperty({ type: [DemographicBucketDto] })
  topCities!: DemographicBucketDto[];

  @ApiProperty({ type: [DemographicBucketDto] })
  topCountries!: DemographicBucketDto[];
}

/** One point in the daily metric time-series. */
export class SocialMetricPointDto {
  @ApiProperty()
  date!: string;

  @ApiPropertyOptional()
  reach?: number;

  @ApiPropertyOptional()
  views?: number;

  @ApiPropertyOptional()
  followerCount?: number;

  @ApiPropertyOptional()
  followersDelta?: number;

  @ApiPropertyOptional()
  profileViews?: number;
}

export class SocialConnectionDto {
  @ApiProperty({ enum: SocialPlatform })
  platform!: SocialPlatform;

  @ApiProperty({ enum: SocialConnectionStatus })
  status!: SocialConnectionStatus;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  accountType?: string;

  @ApiPropertyOptional()
  followersCount?: number;

  @ApiPropertyOptional()
  mediaCount?: number;

  @ApiPropertyOptional()
  connectedAt?: string;

  @ApiPropertyOptional()
  lastSyncedAt?: string;

  @ApiPropertyOptional()
  lastSyncStatus?: string;

  @ApiPropertyOptional({
    description: 'Recent daily metrics (most recent last).',
  })
  metrics?: SocialMetricPointDto[];

  @ApiPropertyOptional({
    description: 'Derived audience demographics (may be empty).',
  })
  audience?: SocialAudienceDto;
}

export class SocialConnectionsResponseDto {
  @ApiProperty({ type: [SocialConnectionDto] })
  connections!: SocialConnectionDto[];
}

export class SocialConnectUrlResponseDto {
  @ApiProperty({
    description: 'Instagram authorize URL to navigate the browser to.',
  })
  url!: string;
}
