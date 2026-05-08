import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BriefContentType,
  BriefDurationBucket,
  BriefShootLocationKind,
  BriefToneStyle,
} from '@prisma/client';

export class BriefDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiPropertyOptional()
  brandName?: string | null;

  @ApiPropertyOptional()
  brandPronunciationAudioKey?: string | null;

  @ApiPropertyOptional()
  brandPronunciationAudioUrl?: string | null;

  @ApiPropertyOptional()
  industry?: string | null;

  @ApiPropertyOptional()
  brandLogoKey?: string | null;

  @ApiPropertyOptional()
  brandLogoUrl?: string | null;

  @ApiPropertyOptional()
  productName?: string | null;

  @ApiPropertyOptional()
  productDescription?: string | null;

  @ApiPropertyOptional()
  productPageUrl?: string | null;

  @ApiPropertyOptional({ enum: BriefShootLocationKind })
  shootLocationKind?: BriefShootLocationKind | null;

  @ApiPropertyOptional()
  shootLocationAddress?: string | null;

  @ApiPropertyOptional({ enum: BriefDurationBucket })
  durationBucket?: BriefDurationBucket | null;

  @ApiPropertyOptional({ enum: BriefContentType })
  contentType?: BriefContentType | null;

  @ApiPropertyOptional({ enum: BriefToneStyle })
  toneStyle?: BriefToneStyle | null;

  @ApiProperty({ type: [String] })
  referenceLinks!: string[];

  @ApiPropertyOptional()
  finalNotes?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

