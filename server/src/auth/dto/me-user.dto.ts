import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Workspace slice of the user returned by `GET /auth/me` and auth flows. */
export class MeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiProperty({ enum: ['CREATOR', 'BRAND'], isArray: true })
  roles!: ('CREATOR' | 'BRAND')[];

  @ApiPropertyOptional({
    enum: ['CREATOR', 'BRAND'],
    nullable: true,
    description:
      'Session-scoped active workspace (what the user is currently acting as)',
  })
  activeRole!: 'CREATOR' | 'BRAND' | null;

  @ApiPropertyOptional({
    enum: ['CREATOR', 'BRAND'],
    nullable: true,
    description:
      'Default workspace role preference (cross-session fallback when activeRole is null)',
  })
  primaryRole!: 'CREATOR' | 'BRAND' | null;

  @ApiProperty()
  hasCreatorProfile!: boolean;

  @ApiProperty()
  hasBrandProfile!: boolean;
}
