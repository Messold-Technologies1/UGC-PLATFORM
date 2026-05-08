import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  BriefContentType,
  BriefDurationBucket,
  BriefShootLocationKind,
  BriefToneStyle,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
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

  @ApiPropertyOptional({ enum: BriefContentType })
  @IsOptional()
  @IsEnum(BriefContentType)
  contentType?: BriefContentType;

  @ApiPropertyOptional({ enum: BriefToneStyle })
  @IsOptional()
  @IsEnum(BriefToneStyle)
  toneStyle?: BriefToneStyle;

  @ApiPropertyOptional({
    description: 'Reference video/asset links (Instagram / Drive / Youtube)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUrl({}, { each: true })
  referenceLinks?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  finalNotes?: string;
}

