import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { PortfolioActingCreatorDto } from './portfolio-acting-creator.dto';

export class CreatePortfolioVideoDto extends PortfolioActingCreatorDto {
  @ApiProperty({
    example: 'creator-portfolio/<creatorId>/videos/<uuid>.mp4',
    description: 'S3 object key after uploading via presigned URL.',
  })
  @IsString()
  videoKey!: string;

  @ApiPropertyOptional({
    example: 'creator-portfolio/<creatorId>/thumbnails/<uuid>.jpg',
    description: 'S3 object key for thumbnail after presigned upload.',
  })
  @IsOptional()
  @IsString()
  thumbnailKey?: string;

  @ApiPropertyOptional({ example: 'Gym' })
  @IsOptional()
  @IsString()
  industryLabel?: string;

  @ApiPropertyOptional({
    example: ['testimonial', 'talking head'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'Short testimonial for a fitness studio.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description:
      'SHA-256 hex of the uploaded file, as sent to the presign call. Stored so ' +
      'the same file cannot be added to this portfolio twice.',
  })
  @IsOptional()
  @IsString()
  contentHash?: string;

  @ApiProperty({ enum: ['public', 'private'], example: 'public' })
  @IsIn(['public', 'private'])
  visibilityStatus!: 'public' | 'private';
}
