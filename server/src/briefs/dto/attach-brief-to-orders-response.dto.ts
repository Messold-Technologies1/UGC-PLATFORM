import { ApiProperty } from '@nestjs/swagger';

export type AttachBriefToOrderResultStatus = 'SUBMITTED' | 'SKIPPED' | 'FAILED';

export class AttachBriefToOrderResultDto {
  @ApiProperty({ example: 'uuid' })
  orderId!: string;

  @ApiProperty({
    enum: ['SUBMITTED', 'SKIPPED', 'FAILED'],
    description:
      'SUBMITTED: brief attached and timeline started. SKIPPED: order was not awaiting a brief (e.g. already submitted). FAILED: order not found or an unexpected error.',
  })
  status!: AttachBriefToOrderResultStatus;

  @ApiProperty({ required: false, nullable: true })
  message?: string | null;
}

export class AttachBriefToOrdersResponseDto {
  @ApiProperty({ type: [AttachBriefToOrderResultDto] })
  results!: AttachBriefToOrderResultDto[];

  @ApiProperty({ example: 3 })
  submittedCount!: number;

  @ApiProperty({ example: 1 })
  skippedCount!: number;

  @ApiProperty({ example: 0 })
  failedCount!: number;
}
