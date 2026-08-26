import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
} from 'class-validator';
import { PortfolioActingCreatorDto } from './portfolio-acting-creator.dto';

/**
 * Upper bound on one import. Chosen to bound the mirror load a single request
 * can create, not for any product reason — each id becomes a job that streams a
 * whole reel.
 */
export const MAX_IMPORT_BATCH = 20;

export class ImportInstagramReelsDto extends PortfolioActingCreatorDto {
  @ApiProperty({
    type: [String],
    example: ['17912345678901234', '17998765432109876'],
    description:
      'Instagram media ids from the gallery. Each must belong to a connection ' +
      'owned by this creator — that check is the authorization boundary.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_BATCH)
  @ArrayUnique()
  @IsString({ each: true })
  igMediaIds!: string[];
}

export class ImportedReelDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: '17912345678901234' })
  igMediaId!: string;

  @ApiProperty({ enum: ['READY', 'PROCESSING', 'FAILED', 'LINK_ONLY'] })
  assetState!: string;
}

export class SkippedReelDto {
  @ApiProperty({ example: '17998765432109876' })
  igMediaId!: string;

  @ApiProperty({
    enum: ['already_imported', 'not_found', 'not_a_reel', 'no_media_url'],
    description: 'Why this id produced no portfolio video.',
  })
  reason!: string;
}

export class ImportInstagramReelsResponseDto {
  @ApiProperty({ type: [ImportedReelDto] })
  imported!: ImportedReelDto[];

  @ApiProperty({ type: [SkippedReelDto] })
  skipped!: SkippedReelDto[];
}
