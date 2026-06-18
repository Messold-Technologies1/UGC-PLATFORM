import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStatus } from '@prisma/client';

/** Workspace slice of the user returned by `GET /auth/me` and auth flows. */
export class MeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiProperty({ enum: ['CREATOR', 'BRAND', 'ADMIN', 'AGENCY'], isArray: true })
  roles!: ('CREATOR' | 'BRAND' | 'ADMIN' | 'AGENCY')[];

  @ApiPropertyOptional({
    enum: ['CREATOR', 'BRAND', 'ADMIN', 'AGENCY'],
    nullable: true,
    description: 'Default workspace role preference (cross-session default)',
  })
  primaryRole!: 'CREATOR' | 'BRAND' | 'ADMIN' | 'AGENCY' | null;

  @ApiProperty()
  hasCreatorProfile!: boolean;

  @ApiPropertyOptional({
    enum: ApprovalStatus,
    nullable: true,
    description:
      'Creator profile approval status. Included when the user has the CREATOR role; null if they have no creator profile yet.',
  })
  creatorApprovalStatus?: ApprovalStatus | null;

  @ApiPropertyOptional({
    description:
      "Creator's one-way Go-Live latch. Included when the user has the CREATOR role.",
    example: false,
  })
  creatorProfileComplete?: boolean;

  @ApiProperty()
  hasBrandProfile!: boolean;

  @ApiProperty()
  hasAgencyProfile!: boolean;

  @ApiProperty({
    description:
      'Whether admin has permanently removed this user’s brand access',
  })
  brandAccessRevoked!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Last active brand for agency owners (server-validated).',
  })
  activeBrandProfileId!: string | null;

  @ApiProperty({
    description:
      'Brands the user can act as (standalone brand profile and/or agency-managed brands).',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        brandName: { type: 'string' },
        logoUrl: { type: 'string', nullable: true },
      },
    },
  })
  accessibleBrands!: Array<{
    id: string;
    brandName: string;
    logoUrl: string | null;
  }>;
}
