import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortfolioSectionVideoItemDto {
  @ApiProperty({ example: 'a505e890-eb10-48b4-920e-4a1c24f0b1f8' })
  videoId!: string;

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ example: 'https://cdn.example.com/creator-portfolio/...mp4' })
  videoUrl!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-portfolio/...jpg',
  })
  thumbnailUrl!: string | null;
}

export class PortfolioSectionResponseDto {
  @ApiProperty({ example: 'a505e890-eb10-48b4-920e-4a1c24f0b1f8' })
  id!: string;

  @ApiProperty({ example: 'a505e890-eb10-48b4-920e-4a1c24f0b1f8' })
  creatorId!: string;

  @ApiProperty({ example: 'Testimonials' })
  name!: string;

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: [PortfolioSectionVideoItemDto] })
  videos!: PortfolioSectionVideoItemDto[];
}
