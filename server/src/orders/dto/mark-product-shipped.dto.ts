import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class MarkProductShippedDto {
  @ApiProperty({ example: 'BlueDart', description: 'Courier / carrier name' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  courierName!: string;

  @ApiPropertyOptional({
    example: 'AWB123456789',
    description: 'Tracking ID (optional but recommended)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  trackingId?: string;

  @ApiProperty({
    description: 'Dispatch date (calendar day, YYYY-MM-DD)',
    example: '2026-05-12',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dispatchDate must be YYYY-MM-DD' })
  dispatchDate!: string;
}
