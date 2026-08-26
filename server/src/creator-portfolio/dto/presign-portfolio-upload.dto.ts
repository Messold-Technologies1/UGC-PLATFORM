import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { PortfolioActingCreatorDto } from './portfolio-acting-creator.dto';

export class PresignPortfolioUploadDto extends PortfolioActingCreatorDto {
  @ApiProperty({ enum: ['video', 'thumbnail'], example: 'video' })
  @IsIn(['video', 'thumbnail'])
  kind!: 'video' | 'thumbnail';

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({ example: 123456 })
  @IsOptional()
  @IsInt()
  @Min(1)
  contentLength?: number;

  @ApiPropertyOptional({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description:
      'SHA-256 hex of the file. Optional. When sent, a file already in this ' +
      "creator's portfolio is rejected here, before the upload starts.",
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'contentHash must be a 64-character hex SHA-256 digest',
  })
  contentHash?: string;
}

export class PresignPortfolioUploadResponseDto {
  @ApiProperty({ example: 'creator-portfolio/<creatorId>/videos/<uuid>.mp4' })
  key!: string;

  @ApiProperty({ example: 'https://s3...signed...' })
  uploadUrl!: string;

  @ApiProperty({
    example: { 'Content-Type': 'video/mp4' },
    additionalProperties: { type: 'string' },
  })
  headers!: Record<string, string>;

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;

  @ApiProperty({ example: 'https://cdn.example.com/creator-portfolio/...mp4' })
  cdnUrl!: string;
}
