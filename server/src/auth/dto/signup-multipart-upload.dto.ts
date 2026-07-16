import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Matches the client cap for signup portfolio videos. */
export const SIGNUP_PORTFOLIO_VIDEO_MAX_BYTES = 1024 * 1024 * 1024; // 1 GiB

const S3_MAX_PARTS = 10_000;

export class SignupCreateMultipartUploadDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  contentType!: string;

  @ApiProperty({ example: 104_857_600 })
  @IsInt()
  @Min(1)
  @Max(SIGNUP_PORTFOLIO_VIDEO_MAX_BYTES)
  contentLength!: number;
}

export class SignupCreateMultipartUploadResponseDto {
  @ApiProperty({ example: 'creator-portfolio-signup-temp/<hash>/<uuid>.mp4' })
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  uploadId!: string;

  @ApiProperty({ example: 'https://cdn.example.com/creator-portfolio-signup-temp/...mp4' })
  cdnUrl!: string;

  @ApiProperty({ example: 10 * 1024 * 1024 })
  partSizeBytes!: number;

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;
}

export class SignupSignMultipartPartDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'creator-portfolio-signup-temp/<hash>/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  @IsString()
  uploadId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(S3_MAX_PARTS)
  partNumber!: number;
}

export class SignupSignMultipartPartResponseDto {
  @ApiProperty({ example: 'https://s3...signed...' })
  url!: string;
}

export class SignupCompletedPartDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(S3_MAX_PARTS)
  partNumber!: number;

  @ApiProperty({ example: '"e868e0f4859b..."' })
  @IsString()
  etag!: string;
}

export class SignupCompleteMultipartUploadDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'creator-portfolio-signup-temp/<hash>/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  @IsString()
  uploadId!: string;

  @ApiProperty({ type: [SignupCompletedPartDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(S3_MAX_PARTS)
  @ValidateNested({ each: true })
  @Type(() => SignupCompletedPartDto)
  parts!: SignupCompletedPartDto[];
}

export class SignupCompleteMultipartUploadResponseDto {
  @ApiProperty({ example: 'creator-portfolio-signup-temp/<hash>/<uuid>.mp4' })
  key!: string;

  @ApiProperty({ example: 'https://cdn.example.com/creator-portfolio-signup-temp/...mp4' })
  cdnUrl!: string;
}

export class SignupAbortMultipartUploadDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'creator-portfolio-signup-temp/<hash>/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  @IsString()
  uploadId!: string;
}
