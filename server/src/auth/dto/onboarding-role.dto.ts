import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/**
 * Body for POST /auth/onboarding/role — the post-signup "choose your role"
 * step. Only CREATOR and BRAND are self-selectable; ADMIN and AGENCY are
 * provisioned through other flows.
 */
export class OnboardingRoleDto {
  @ApiProperty({ enum: ['CREATOR', 'BRAND'], example: 'CREATOR' })
  @IsIn(['CREATOR', 'BRAND'])
  role!: 'CREATOR' | 'BRAND';
}
