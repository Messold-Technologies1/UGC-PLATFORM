import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminAgencyListItemDto {
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

  @ApiPropertyOptional({ nullable: true })
  contactPhone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ type: [String] })
  brandNames!: string[];

  @ApiProperty({ example: 3 })
  brandCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
