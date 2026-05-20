import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SwitchAgencyBrandResponseDto {
  @ApiProperty()
  activeBrandProfileId!: string;

  @ApiProperty()
  brandName!: string;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;
}
