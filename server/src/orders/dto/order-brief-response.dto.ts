import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderBriefResponseDto {
  @ApiProperty({ example: 'uuid' })
  orderId!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  briefSubmittedAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  briefAcceptedAt?: Date | null;

  @ApiProperty({ example: 7 })
  deliveryDaysSnapshot!: number;

  @ApiProperty({
    description:
      'When false, delivery deadline is set at brief acceptance; when true, it is set when the creator confirms product receipt',
  })
  requiresPhysicalProductShipment!: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Delivery due date (deliveryDaysSnapshot + 2 grace). Null until the delivery clock starts.',
  })
  deliveryDeadlineAt?: Date | null;

  @ApiPropertyOptional({
    description:
      'Campaign brief (structured object from saved Brief); null if not submitted yet',
    type: 'object',
    additionalProperties: true,
  })
  brief!: Record<string, unknown> | null;
}
