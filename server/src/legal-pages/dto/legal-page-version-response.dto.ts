import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LegalPageVersionListItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  changedBy!: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  changedByEmail?: string;

  @ApiPropertyOptional({ example: 'Updated GDPR section' })
  changeNote!: string | null;

  @ApiPropertyOptional({ example: 'uuid', description: 'If this version was restored from a previous one, its ID.' })
  restoredFromVersionId?: string;

  @ApiProperty()
  createdAt!: Date;
}

export class LegalPageVersionListResponseDto {
  @ApiProperty({ type: [LegalPageVersionListItemDto] })
  versions!: LegalPageVersionListItemDto[];
}

export class LegalPageVersionDetailResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  pageId!: string;

  @ApiProperty({
    description: 'Full snapshot: { title, description, effectiveDate, sections[] }',
  })
  snapshot!: Record<string, unknown>;

  @ApiProperty({ example: 'uuid' })
  changedBy!: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  changedByEmail?: string;

  @ApiPropertyOptional({ example: 'Updated GDPR section' })
  changeNote!: string | null;

  @ApiPropertyOptional({ example: 'uuid', description: 'If this version was restored from a previous one, its ID.' })
  restoredFromVersionId?: string;

  @ApiProperty()
  createdAt!: Date;
}
