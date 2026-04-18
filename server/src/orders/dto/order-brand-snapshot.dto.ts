import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderBrandSnapshotDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Acme Co' })
  companyName!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/brand-logo/...png',
  })
  logoUrl?: string | null;
}
