import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LegalSectionResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'who-this-policy-applies-to' })
  anchorId!: string;

  @ApiProperty({ example: 'Who This Policy Applies To' })
  title!: string;

  @ApiProperty({ example: 'Who This Applies To' })
  tocLabel!: string;

  @ApiProperty({ description: 'Sanitized HTML content of the section body.' })
  content!: string;

  @ApiProperty({ example: 0 })
  sortOrder!: number;
}

export class LegalPageResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'privacy-policy' })
  slug!: string;

  @ApiProperty({ example: 'Privacy Policy' })
  title!: string;

  @ApiProperty({
    example:
      "Read GoCollab's Privacy Policy to learn how we collect, use, and protect your personal information.",
  })
  description!: string;

  @ApiProperty({ example: 'June 16, 2026' })
  effectiveDate!: string;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [LegalSectionResponseDto] })
  sections!: LegalSectionResponseDto[];
}
