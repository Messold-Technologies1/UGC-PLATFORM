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
}
