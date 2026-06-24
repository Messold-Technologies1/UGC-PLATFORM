import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LegalPageVersionListItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  changedBy!: string;

  @ApiPropertyOptional({ example: 'Updated GDPR section' })
  changeNote!: string | null;

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

  @ApiPropertyOptional({ example: 'Updated GDPR section' })
  changeNote!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
