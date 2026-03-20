import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatorLanguageResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'English' })
  language!: string;
}

export class CreatorServiceTypeResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Video Editing' })
  name!: string;
}

export class CreatorServiceResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  serviceTypeId!: string;

  @ApiProperty({
    type: () => CreatorServiceTypeResponseDto,
  })
  serviceType!: CreatorServiceTypeResponseDto;
}

export class CreatorPackageResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Basic' })
  name!: string;

  @ApiProperty({
    example: ['1 Video', 'Basic editing'],
    type: [String],
  })
  deliverables!: string[];

  @ApiProperty({ example: '199.99' })
  priceAmount!: string;

  @ApiProperty({ example: 3 })
  deliveryDays!: number;
}

export class CreatorProfileResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Jane Doe' })
  displayName!: string;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  city?: string | null;

  @ApiPropertyOptional({ example: 'I make short-form UGC for brands.' })
  bio?: string | null;

  @ApiPropertyOptional({ example: 'Female' })
  gender?: string | null;

  @ApiPropertyOptional({ example: '18-24' })
  ageRange?: string | null;

  @ApiPropertyOptional({ example: 15 })
  travelRadius?: number | null;

  @ApiProperty({ type: () => [CreatorLanguageResponseDto] })
  languages!: CreatorLanguageResponseDto[];

  @ApiProperty({ type: () => [CreatorServiceResponseDto] })
  services!: CreatorServiceResponseDto[];

  @ApiProperty({ type: () => [CreatorPackageResponseDto] })
  packages!: CreatorPackageResponseDto[];
}
