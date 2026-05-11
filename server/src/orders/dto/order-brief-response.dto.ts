import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderBriefResponseDto {
  @ApiProperty({ example: 'uuid' })
  orderId!: string;

  @ApiPropertyOptional()
  briefSubmittedAt?: Date | null;

  @ApiPropertyOptional()
  briefAcceptedAt?: Date | null;

  @ApiPropertyOptional({
    description:
      'Campaign brief (structured object from saved Brief); null if not submitted yet',
    type: 'object',
    additionalProperties: true,
  })
  brief!: Record<string, unknown> | null;
}
