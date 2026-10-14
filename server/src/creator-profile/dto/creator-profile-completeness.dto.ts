import { ApiProperty } from '@nestjs/swagger';

export class CreatorProfileRequirementDto {
  @ApiProperty({
    example: 'payoutDetails',
    description:
      'Stable key for this requirement, so the UI can route it to the step that fixes it.',
  })
  key!: string;

  @ApiProperty({ example: 'Payout details' })
  label!: string;
}

export class CreatorProfileCompletenessDto {
  @ApiProperty({
    description: 'True when nothing on the checklist is outstanding.',
  })
  complete!: boolean;

  @ApiProperty({
    description: 'Whether the profile is live on the marketplace.',
  })
  isListed!: boolean;

  @ApiProperty({
    type: [CreatorProfileRequirementDto],
    description:
      'Everything still missing, re-evaluated live (Go-Live checklist + OTP verification + payout details). Empty when complete.',
  })
  missing!: CreatorProfileRequirementDto[];
}
