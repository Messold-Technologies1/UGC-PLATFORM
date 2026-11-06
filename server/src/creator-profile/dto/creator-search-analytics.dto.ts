import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CreatorSearchAnalyticsQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Start of the window. Defaults to 30 days before `to`.',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-11-01T00:00:00.000Z',
    description: 'End of the window. Defaults to now.',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({
    enum: ['BRAND', 'AGENCY', 'GUEST', 'OTHER'],
    description: 'Only count searches from this audience.',
  })
  @IsOptional()
  @IsIn(['BRAND', 'AGENCY', 'GUEST', 'OTHER'])
  audience?: 'BRAND' | 'AGENCY' | 'GUEST' | 'OTHER';

  @ApiPropertyOptional({ description: 'Only count one brand’s searches.' })
  @IsOptional()
  @IsUUID()
  brandProfileId?: string;
}

class FilterValueCountDto {
  @ApiProperty() value!: string;
  @ApiProperty() searches!: number;
}

class FilterUsageDto {
  @ApiProperty({ example: 'contentCategory' }) key!: string;
  @ApiProperty({ description: 'Searches in which this filter was set.' })
  searches!: number;
  @ApiProperty({
    description: 'Percentage of sampled searches that set this filter.',
    example: 42.5,
  })
  shareOfSearches!: number;
  @ApiProperty({ type: [FilterValueCountDto] })
  topValues!: FilterValueCountDto[];
}

class AudienceCountDto {
  @ApiProperty({ example: 'BRAND' }) audience!: string;
  @ApiProperty() searches!: number;
}

class SearchTermCountDto {
  @ApiProperty() term!: string;
  @ApiProperty() searches!: number;
}

class ZeroResultFilterDto {
  @ApiProperty() key!: string;
  @ApiProperty() searches!: number;
}

export class CreatorSearchAnalyticsResponseDto {
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty() totalSearches!: number;
  @ApiProperty({ description: 'Searches that set no filter at all.' })
  unfilteredSearches!: number;
  @ApiProperty({ description: 'Searches that matched no creator.' })
  zeroResultSearches!: number;
  @ApiProperty({ type: [AudienceCountDto] })
  byAudience!: AudienceCountDto[];
  @ApiProperty({ type: [FilterUsageDto] })
  filters!: FilterUsageDto[];
  @ApiProperty({ type: [SearchTermCountDto] })
  topSearchTerms!: SearchTermCountDto[];
  @ApiProperty({ type: [ZeroResultFilterDto] })
  topZeroResultFilters!: ZeroResultFilterDto[];
}
