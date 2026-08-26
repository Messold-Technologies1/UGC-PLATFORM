import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { PortfolioActingCreatorDto } from './portfolio-acting-creator.dto';

export class UpdatePortfolioVideoDto extends PortfolioActingCreatorDto {
  @ApiPropertyOptional({
    example: 'creator-portfolio/<creatorId>/videos/<uuid>.mp4',
    description:
      'Replacement video: S3 object key of an already-uploaded file. Send this to swap the ' +
      'clip while keeping the same portfolio entry — the only way to change a video once the ' +
      'portfolio is at the minimum-videos floor, where deleting is refused.',
  })
  @IsOptional()
  @IsString()
  videoKey?: string;

  @ApiPropertyOptional({
    example: 'creator-portfolio/<creatorId>/thumbnails/<uuid>.jpg',
    description:
      'Thumbnail for the replacement video. When videoKey is sent without this, the existing ' +
      'thumbnail is cleared rather than kept — it belongs to the outgoing clip.',
  })
  @IsOptional()
  @IsString()
  thumbnailKey?: string;

  @ApiPropertyOptional({ example: 'gym' })
  @IsOptional()
  @IsString()
  industryLabel?: string;

  @ApiPropertyOptional({ example: ['testimonial', 'talking head'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['public', 'private'] })
  @IsOptional()
  @IsIn(['public', 'private'])
  visibilityStatus?: 'public' | 'private';
}

