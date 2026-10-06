import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for POST /auth/onboarding/role — the post-signup "choose your role"
 * step. CREATOR, BRAND, and AGENCY are self-selectable; ADMIN is provisioned
 * through a separate flow.
 */
export class OnboardingRoleDto {
  @ApiProperty({ enum: ['CREATOR', 'BRAND', 'AGENCY'], example: 'CREATOR' })
  @IsIn(['CREATOR', 'BRAND', 'AGENCY'])
  role!: 'CREATOR' | 'BRAND' | 'AGENCY';

  /**
   * Meta attribution cookies read in the user's own browser at this step. Stored
   * on the creator profile so the Conversions API can replay them on events that
   * fire out-of-band later (e.g. CreatorProfileListed on admin approval).
   */
  @ApiPropertyOptional({ description: 'Meta _fbp browser cookie' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaFbp?: string;

  @ApiPropertyOptional({ description: 'Meta _fbc ad-click cookie' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  metaFbc?: string;
}
