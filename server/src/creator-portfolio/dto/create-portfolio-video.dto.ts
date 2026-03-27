import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePortfolioVideoDto {
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

  @ApiPropertyOptional({ example: 'Short testimonial for a fitness studio.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['public', 'private'], example: 'public' })
  @IsIn(['public', 'private'])
  visibilityStatus!: 'public' | 'private';
}

