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

  @ApiPropertyOptional({
    example: 'brief-product/<briefId>/<uuid>.png',
  })
  productImageKey?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/brief-product/<briefId>/<uuid>.png',
  })
  productImageUrl?: string | null;

  @ApiProperty({
    description:
      'Whether the brand will physically ship a product to the creator for this campaign',
    default: false,
  })
  willShipPhysicalProductToCreator!: boolean;

  @ApiPropertyOptional({ enum: BriefShootLocationKind })
  shootLocationKind?: BriefShootLocationKind | null;

  @ApiPropertyOptional()
  shootLocationAddress?: string | null;

  @ApiPropertyOptional({ enum: BriefDurationBucket })
  durationBucket?: BriefDurationBucket | null;

  @ApiProperty({ enum: BriefContentType, isArray: true })
  contentType!: BriefContentType[];

  @ApiProperty({ enum: BriefToneStyle, isArray: true })
  toneStyle!: BriefToneStyle[];

  @ApiPropertyOptional()
  keyNoteToInclude?: string | null;

  @ApiPropertyOptional()
  ctaNote?: string | null;

  @ApiProperty({ type: [String] })
  referenceLinks!: string[];

  @ApiPropertyOptional()
  finalNotes?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

