import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgencyProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ownerUserId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  logoKey!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  website!: string | null;

  @ApiProperty()
  contactFullName!: string;

  @ApiProperty()
  contactEmail!: string;

  @ApiPropertyOptional({ nullable: true })
  contactPhone!: string | null;

  @ApiProperty()
  contactPhoneVerified!: boolean;

  @ApiProperty({
    description: 'Brand names collected from brief submissions.',
    type: [String],
  })
  brandNames!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
