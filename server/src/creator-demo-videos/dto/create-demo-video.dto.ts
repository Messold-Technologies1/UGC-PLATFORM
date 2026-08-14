import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDemoVideoDto {
  @ApiProperty({ example: 'Eye-level GRWM in natural light' })
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({
    example: 'Eye-level, natural light, says niche + languages in the first 5s.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  caption?: string;

  @ApiProperty({
    example: 'creator-demo-videos/<uuid>.mp4',
    description: 'S3 object key after uploading via presigned URL.',
  })
  @IsString()
  videoKey!: string;

  @ApiPropertyOptional({
    example: 'creator-demo-videos/thumbnails/<uuid>.jpg',
    description: 'S3 object key for the poster thumbnail after presigned upload.',
  })
  @IsOptional()
  @IsString()
  thumbnailKey?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
