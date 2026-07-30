import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum LegalImportFormatDto {
  HTML = 'html',
  MARKDOWN = 'markdown',
}

/**
 * Import an uploaded document into a legal page's draft. The raw file content
 * (HTML or Markdown) is parsed into sections and then run through the normal
 * draft pipeline (sanitize → review → publish). Metadata fields are optional;
 * when omitted the current live (or draft) values are kept.
 */
export class ImportDraftDto {
  @ApiProperty({
    enum: LegalImportFormatDto,
    example: LegalImportFormatDto.MARKDOWN,
    description: 'Format of the uploaded content.',
  })
  @IsEnum(LegalImportFormatDto)
  format!: LegalImportFormatDto;

  @ApiProperty({
    description: 'Raw document content (HTML markup or Markdown source).',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1_000_000)
  content!: string;

  @ApiPropertyOptional({
    example: 'Privacy Policy',
    description: 'Optional page title override. Defaults to the current value.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    description:
      'Optional SEO/subtitle description override. Defaults to the current value.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 'June 16, 2026',
    description: 'Optional effective-date override. Defaults to the current value.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  effectiveDate?: string;

  @ApiPropertyOptional({
    example: 'Imported from privacy-policy.md',
    description: 'Optional note describing the import.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changeNote?: string;
}
