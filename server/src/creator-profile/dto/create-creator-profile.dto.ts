import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatorPackageCreateDto {
  @ApiProperty({ example: 'Basic' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '["1 Video", "Basic editing"]' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  deliverables!: string[];

  @ApiProperty({ example: '199.99' })
  @IsNumberString()
  priceAmount!: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  deliveryDays!: number;
}

export class CreateCreatorProfileDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  displayName!: string;

  @ApiPropertyOptional({
    example: 'creator-profile-temp/<userId>/<uuid>.jpg',
    description:
      'Temporary S3 object key returned by profile-image presign endpoint before profile creation (optional).',
  })
  @IsOptional()
  @IsString()
  profileImageKey?: string;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'I make short-form UGC for brands.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'Female' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  travelRadius?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  onLocationAvailable?: boolean;

  @ApiPropertyOptional({
    example: '499.00',
    description:
      'Optional on-location fee. Required only when onLocationAvailable is true (validation handled in service if needed).',
  })
  @IsOptional()
  @IsNumberString()
  onLocationFee?: string;

  @ApiPropertyOptional({ type: [String], example: ['English', 'Hindi'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['UGC Video', 'Voice Over'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Clean aesthetic', 'Friendly'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  personaTags?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['does not accept alcohol', 'does not accept gambling'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  restrictions?: string[];

  @ApiPropertyOptional({
    type: [CreatorPackageCreateDto],
    example: [
      {
        name: 'Basic',
        deliverables: ['1 Video', 'Basic editing'],
        priceAmount: '199.99',
        deliveryDays: 3,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatorPackageCreateDto)
  packages?: CreatorPackageCreateDto[];
}
