import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorGender } from '@prisma/client';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterCreatorDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'securePassword123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MinLength(8)
  @Matches(/^\+\d{8,15}$/, {
    message: 'phone must be E.164 (e.g. +919876543210)',
  })
  phone!: string;

  /** Optional while signup OTP verification is disabled on the server. */
  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  phoneOtpCode?: string;

  @ApiProperty({ example: 28, description: 'Age in years; stored as Jan 1 dateOfBirth' })
  @IsInt()
  @Min(13)
  @Max(120)
  age!: number;

  @ApiProperty({ enum: CreatorGender })
  @IsEnum(CreatorGender)
  gender!: CreatorGender;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  city!: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  state!: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  country!: string;

  @ApiPropertyOptional({ example: 'Short bio' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string;

  @ApiPropertyOptional({
    example: 'https://drive.google.com/drive/folders/abc123',
    description:
      'Optional Google Drive sharing link (Anyone with the link → Viewer)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(/^https:\/\/(drive\.google\.com|docs\.google\.com)\/.+/i, {
    message:
      'driveLink must be a Google Drive or Google Docs URL (https://drive.google.com/... or https://docs.google.com/...)',
  })
  driveLink?: string;

  @ApiProperty({
    type: [String],
    description: 'CONTENT_CATEGORY facet slugs',
    example: ['beauty'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  categorySlugs!: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Keys from signup portfolio presign (same email as registration)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioSignupVideoTempKeys?: string[];
}
