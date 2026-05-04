import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandCategory } from '@prisma/client';

export class AdminBrandListItemDto {
  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiPropertyOptional({ example: 'brand-profile-uuid', nullable: true })
  brandProfileId!: string | null;

  @ApiProperty({ example: 'brand@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Acme Team', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: 'Acme', nullable: true })
  brandName!: string | null;

  @ApiPropertyOptional({ example: 'Jane Doe', nullable: true })
  contactFullName!: string | null;

  @ApiPropertyOptional({ example: '+91 98765 43210', nullable: true })
  contactPhone!: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/brand-logo/logo.png',
    nullable: true,
  })
  logoUrl!: string | null;
  @ApiProperty({
    enum: BrandCategory,
    isArray: true,
    description: 'Selected brand categories.',
  })
  categories!: BrandCategory[];

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
