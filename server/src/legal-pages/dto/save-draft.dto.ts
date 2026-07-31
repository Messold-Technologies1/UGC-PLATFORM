import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class DraftSectionInputDto {
  @ApiProperty({
    example: 'who-this-policy-applies-to',
    description: 'URL-safe anchor identifier. Must be lowercase with hyphens.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'anchorId must be lowercase alphanumeric with hyphens (e.g. "data-security")',
  })
  anchorId!: string;

  @ApiProperty({ example: 'Who This Policy Applies To' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiProperty({ example: 'Who This Applies To' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  tocLabel!: string;

  @ApiProperty({ description: 'HTML content of the section body.' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class SaveDraftDto {
  @ApiProperty({ example: 'Privacy Policy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiProperty({
    example:
      "Read GoCollab's Privacy Policy to learn how we collect, use, and protect your personal information.",
    description: 'Optional; may be an empty string.',
  })
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ example: 'June 16, 2026', description: 'Optional; may be an empty string.' })
  @IsString()
  @MaxLength(100)
  effectiveDate!: string;

  @ApiProperty({
    type: [DraftSectionInputDto],
    description: 'Complete ordered list of sections for this draft.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DraftSectionInputDto)
  sections!: DraftSectionInputDto[];

  @ApiPropertyOptional({
    example: 'Updated GDPR section',
    description: 'Optional note describing the changes.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changeNote?: string;
}
