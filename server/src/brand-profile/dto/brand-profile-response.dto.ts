import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrandProfileResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'brand@example.com' })
  email!: string;

  @ApiProperty({ example: 'Acme Inc.' })
  companyName!: string;

  @ApiPropertyOptional({ example: 'brand-logo/<brandProfileId>/<uuid>.png' })
  logoKey!: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/brand-logo/...png' })
  logoUrl!: string | null;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  website!: string | null;

  @ApiPropertyOptional({ example: 'Skincare' })
  industry!: string | null;

  @ApiPropertyOptional({ example: 'Jane (Marketing Lead)' })
  contactPerson!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
