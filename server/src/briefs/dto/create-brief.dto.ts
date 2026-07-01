import {  ApiPropertyOptional } from '@nestjs/swagger';
import {
  BriefContentType,
  BriefDurationBucket,
  BriefShootLocationKind,
  BriefToneStyle,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateBriefDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandLogoKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  brandLogoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandPronunciationAudioKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  brandPronunciationAudioUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  productPageUrl?: string;

  @ApiPropertyOptional({
    example: 'brief-product-temp/<userId>/<uuid>.png',
    description:
      'Temporary S3 object key from POST /briefs/uploads/presign-product-image; required when isProduct is true.',
  })
  @IsOptional()
  @IsString()
  productImageKey?: string;

  @ApiPropertyOptional({
    description:
      'When true, brief is for a product (image required). When false, service brief.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isProduct?: boolean;

  @ApiPropertyOptional({
    description:
      'Set true if the brand will physically ship a product to the creator for the shoot',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  willShipPhysicalProductToCreator?: boolean;

  @ApiPropertyOptional({ enum: BriefShootLocationKind })
  @IsOptional()
  @IsEnum(BriefShootLocationKind)
  shootLocationKind?: BriefShootLocationKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shootLocationAddress?: string;

  @ApiPropertyOptional({ enum: BriefDurationBucket })
  @IsOptional()
  @IsEnum(BriefDurationBucket)
  durationBucket?: BriefDurationBucket;

  @ApiPropertyOptional({ enum: BriefContentType, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsEnum(BriefContentType, { each: true })
  contentType?: BriefContentType[];

  @ApiPropertyOptional({ enum: BriefToneStyle, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsEnum(BriefToneStyle, { each: true })
  toneStyle?: BriefToneStyle[];

  @ApiPropertyOptional({
    description: 'Key messaging or points the creator should include in the piece',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  keyNoteToInclude?: string;

  @ApiPropertyOptional({
    description: 'Call-to-action line or instruction for the end of the video',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  ctaNote?: string;

  @ApiPropertyOptional({
    description: 'Reference video/asset links (Instagram / Drive / Youtube)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUrl({}, { each: true })
  referenceLinks?: string[];

  @ApiPropertyOptional({
    description:
      'Campaign script as JSON (object or array), e.g. scenes, lines, or structured brief copy.',
    type: 'object',
    additionalProperties: true,
    example: { scenes: [{ title: 'Hook', lines: ['Try this product…'] }] },
  })
  @IsOptional()
  script?: Record<string, unknown> | unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  finalNotes?: string;
}

