import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
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

  @ApiProperty({
    example:
      "Read GoCollab's Refund Policy to understand how refunds are handled.",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ example: 'June 16, 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  effectiveDate!: string;
}
