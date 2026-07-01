import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class AcceptBriefResponseDto {
  @ApiProperty({ example: 'uuid' })
  orderId!: string;

  @ApiProperty({ enum: OrderStatus, example: 'BRIEF_ACCEPTED' })
  status!: OrderStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-15T07:06:29.604Z',
  })
  briefAcceptedAt!: Date;

  @ApiProperty({
    description:
      'When false, delivery deadlines are set at brief acceptance; when true, they are set when the creator confirms product receipt',
  })
  requiresPhysicalProductShipment!: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Promised delivery due date. Null until product is received when physical shipment applies.',
    example: '2026-05-22T07:06:29.604Z',
  })
  deliveryDueAt?: Date | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Final delivery cutoff after grace period. Null until the delivery clock starts.',
    example: '2026-05-24T07:06:29.604Z',
  })
  deliveryGraceDeadlineAt?: Date | null;
}
