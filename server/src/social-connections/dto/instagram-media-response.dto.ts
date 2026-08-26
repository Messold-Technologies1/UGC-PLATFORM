import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListInstagramMediaQueryDto {
  @ApiPropertyOptional({
    description:
      'Keyset cursor from a previous response. This is OUR cursor over the ' +
      "cache, not Instagram's — the Graph cursor never leaves the server.",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ example: 24, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class InstagramMediaItemDto {
  @ApiProperty({ example: '17912345678901234' })
  igMediaId!: string;

  @ApiPropertyOptional({ example: 'https://www.instagram.com/reel/Cxyz/' })
  permalink!: string | null;

  @ApiPropertyOptional({
    description:
      'Signed CDN URL. Short-lived — treat as display-only and never persist.',
  })
  thumbnailUrl!: string | null;

  @ApiPropertyOptional({ example: 'GRWM with the new serum' })
  caption!: string | null;

  @ApiPropertyOptional()
  postedAt!: Date | null;

  @ApiPropertyOptional({ example: 34 })
  durationSeconds!: number | null;

  @ApiPropertyOptional({ example: 812 })
  likeCount!: number | null;

  @ApiPropertyOptional({ example: 41203 })
  viewCount!: number | null;

  @ApiProperty({
    description: 'True when this reel is already a portfolio video.',
  })
  alreadyImported!: boolean;

  @ApiPropertyOptional()
  portfolioVideoId!: string | null;
}

export class InstagramMediaPageDto {
  @ApiProperty({
    enum: ['ready', 'syncing', 'error', 'not_connected', 'reconnect_required'],
    description:
      '`syncing` means a batch is in flight or the cache has aged past its ' +
      'TTL. Whatever is cached is returned alongside it so the gallery renders ' +
      'immediately.',
  })
  status!: string;

  @ApiPropertyOptional({ example: 'creator.handle' })
  username!: string | null;

  @ApiPropertyOptional({
    description:
      'When a sync batch last completed. Not "last full walk" — a batch that ' +
      'stopped at its reel budget still refreshed the top of the account.',
  })
  lastSyncedAt!: Date | null;

  @ApiProperty({ description: 'True once the cache is older than the TTL.' })
  stale!: boolean;

  @ApiProperty({ type: [InstagramMediaItemDto] })
  items!: InstagramMediaItemDto[];

  @ApiPropertyOptional({
    description: 'Pass back as `cursor` for the next page.',
  })
  nextCursor!: string | null;

  @ApiProperty({
    description:
      'True when Instagram has reels past the end of the cache. Reaching the ' +
      'cache tail with this set is what surfaces "Load more"; POST ' +
      '`media/load-more` fetches the next batch. Paging within the cache is ' +
      'free, so only that call spends a Graph request.',
  })
  hasMoreOnInstagram!: boolean;

  @ApiProperty({ example: 47 })
  reelCount!: number;

  @ApiPropertyOptional()
  error!: string | null;
}

export class InstagramMediaStatusDto {
  @ApiProperty({ enum: ['idle', 'queued', 'syncing', 'ready', 'error'] })
  status!: string;

  @ApiProperty({ example: 47 })
  reelCount!: number;

  @ApiPropertyOptional({
    description: 'When a sync batch last completed successfully.',
  })
  lastSyncedAt!: Date | null;

  @ApiProperty({
    description: 'True when Instagram has reels past the end of the cache.',
  })
  hasMore!: boolean;

  @ApiPropertyOptional()
  error!: string | null;
}
