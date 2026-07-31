import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Create a brand-new legal page. The page starts with no sections; content is
 * added afterwards in the editor (by hand or via file import) and goes through
 * the normal draft → review → publish pipeline.
 */
export class CreateLegalPageDto {
  @ApiProperty({
    example: 'refund-policy',
    description: 'URL-safe slug. Lowercase alphanumeric with hyphens.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'slug must be lowercase alphanumeric with hyphens (e.g. "refund-policy")',
  })
  slug!: string;

  @ApiProperty({ example: 'Refund Policy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional({
    example:
      "Read GoCollab's Refund Policy to understand how refunds are handled.",
    description: 'Optional. Defaults to empty and can be added later.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 'June 16, 2026',
    description: 'Optional. Defaults to empty and can be added later.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  effectiveDate?: string;
}
