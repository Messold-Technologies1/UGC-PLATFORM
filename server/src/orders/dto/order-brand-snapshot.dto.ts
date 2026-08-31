import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderBrandSnapshotDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ example: 'Acme Co', nullable: true })
  brandName!: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/brand-logo/...png',
  })
  logoUrl?: string | null;

  @ApiPropertyOptional({
    example: 'Jane Doe',
    nullable: true,
    description: 'Brand contact name. Admin order views only.',
  })
  contactFullName?: string | null;

  @ApiPropertyOptional({
    example: 'jane@acme.com',
    nullable: true,
    description: 'Brand contact email. Admin order views only.',
  })
  contactEmail?: string | null;
}
