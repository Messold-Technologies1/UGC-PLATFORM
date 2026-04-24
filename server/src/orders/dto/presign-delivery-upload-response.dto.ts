import { ApiProperty } from '@nestjs/swagger';

export class PresignedDeliveryUploadItemDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty({ example: { 'Content-Type': 'video/mp4' } })
  headers!: Record<string, string>;

  @ApiProperty()
  expiresInSeconds!: number;

  @ApiProperty()
  cdnUrl!: string;
}

export class PresignDeliveryUploadResponseDto {
  @ApiProperty({ type: () => [PresignedDeliveryUploadItemDto] })
  uploads!: PresignedDeliveryUploadItemDto[];
}

