import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminBrandListItemDto {
  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiPropertyOptional({ example: 'brand-profile-uuid', nullable: true })
  brandProfileId!: string | null;

  @ApiProperty({ example: 'brand@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Acme Team', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: 'Acme Inc.', nullable: true })
  companyName!: string | null;

  @ApiPropertyOptional({ example: 'Skincare', nullable: true })
  industry!: string | null;

  @ApiPropertyOptional({ example: 'Jane (Marketing Lead)', nullable: true })
  contactPerson!: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/brand-logo/logo.png',
    nullable: true,
  })
  logoUrl!: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
