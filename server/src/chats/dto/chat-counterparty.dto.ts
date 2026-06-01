import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatBrandCounterpartyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  brandName!: string;

  @ApiPropertyOptional()
  logoUrl?: string | null;
}

export class ChatCreatorCounterpartyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  introVideoUrl?: string | null;

  @ApiPropertyOptional()
  city?: string | null;
}
