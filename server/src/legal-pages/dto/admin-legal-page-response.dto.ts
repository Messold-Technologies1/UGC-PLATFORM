import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegalDraftStatus } from '@prisma/client';
import { LegalSectionResponseDto } from './legal-page-response.dto';

export class DraftSectionDto {
  @ApiProperty({ example: 'who-this-policy-applies-to' })
  anchorId!: string;

  @ApiProperty({ example: 'Who This Policy Applies To' })
  title!: string;

  @ApiProperty({ example: 'Who This Applies To' })
  tocLabel!: string;

  @ApiProperty({ description: 'HTML content of the section body.' })
  content!: string;

  @ApiProperty({ example: 0 })
  sortOrder!: number;
}

export class LegalPageDraftResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ enum: LegalDraftStatus })
  status!: LegalDraftStatus;

  @ApiProperty({ example: 'Privacy Policy' })
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ example: 'June 16, 2026' })
  effectiveDate!: string;

  @ApiProperty({ type: [DraftSectionDto] })
  sections!: DraftSectionDto[];

  @ApiPropertyOptional({ example: 'Updated GDPR section' })
  changeNote!: string | null;

  @ApiProperty({ example: 'uuid', description: 'Admin who created the draft.' })
  createdBy!: string;

  @ApiPropertyOptional({
    example: 'Please add the cookie policy link.',
    description: 'Feedback from reviewer on reject.',
  })
  reviewNote!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class AdminLegalPageListItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'privacy-policy' })
  slug!: string;

  @ApiProperty({ example: 'Privacy Policy' })
  title!: string;

  @ApiProperty({ example: 'June 16, 2026' })
  effectiveDate!: string;

  @ApiProperty({ example: 23 })
  sectionCount!: number;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({
    enum: LegalDraftStatus,
    nullable: true,
    description: 'Draft status, or null if no active draft.',
  })
  draftStatus!: LegalDraftStatus | null;
}

export class AdminLegalPageListResponseDto {
  @ApiProperty({ type: [AdminLegalPageListItemDto] })
  pages!: AdminLegalPageListItemDto[];
}

export class AdminLegalPageDetailResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'privacy-policy' })
  slug!: string;

  @ApiProperty({ example: 'Privacy Policy' })
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ example: 'June 16, 2026' })
  effectiveDate!: string;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({
    type: [LegalSectionResponseDto],
    description: 'Currently published sections.',
  })
  sections!: LegalSectionResponseDto[];

  @ApiPropertyOptional({
    type: LegalPageDraftResponseDto,
    nullable: true,
    description: 'Active draft if one exists, otherwise null.',
  })
  draft!: LegalPageDraftResponseDto | null;
}
