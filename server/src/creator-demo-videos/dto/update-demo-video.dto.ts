import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDemoVideoDto {
  @ApiPropertyOptional({
    example: 'creator-demo-videos/<uuid>.mp4',
    description: 'Pass to replace the video after a fresh presigned upload.',
  })
  @IsOptional()
  @IsString()
  videoKey?: string;

  @ApiPropertyOptional({
    example: 'creator-demo-videos/thumbnails/<uuid>.jpg',
    description: 'Pass to replace the poster thumbnail after a fresh presigned upload.',
  })
  @IsOptional()
  @IsString()
  thumbnailKey?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
