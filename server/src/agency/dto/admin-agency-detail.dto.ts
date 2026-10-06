import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminAgencyDetailDto {
  @ApiProperty()
  agencyId!: string;

  @ApiProperty()
  ownerUserId!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  ownerName!: string | null;

  @ApiProperty()
  agencyName!: string;

  @ApiProperty()
  contactFullName!: string;

  @ApiProperty()
  contactEmail!: string;

  @ApiPropertyOptional({ nullable: true })
  contactPhone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  website!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  statusChangedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  statusChangedByName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  statusChangedByEmail!: string | null;

  @ApiProperty({ type: [String] })
  brandNames!: string[];

  @ApiProperty()
  brandCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
