import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DraftSectionInputDto } from './save-draft.dto';

export class CreateLegalPageDto {
  @ApiProperty({
    example: 'cookie-policy',
    description:
      'URL-safe slug for the page. Must be unique, lowercase with hyphens.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must be lowercase alphanumeric with hyphens (e.g. "cookie-policy")',
  })
  slug!: string;

  @ApiProperty({ example: 'Cookie Policy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiProperty({
    example: 'Learn about how GoCollab uses cookies.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ example: 'June 24, 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  effectiveDate!: string;

  @ApiPropertyOptional({
    type: [DraftSectionInputDto],
    description:
      'Initial sections for the page. If provided, a DRAFT is created immediately.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DraftSectionInputDto)
  sections?: DraftSectionInputDto[];
}
