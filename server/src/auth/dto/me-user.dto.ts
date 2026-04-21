import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Workspace slice of the user returned by `GET /auth/me` and auth flows. */
export class MeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiProperty({ enum: ['CREATOR', 'BRAND', 'ADMIN'], isArray: true })
  roles!: ('CREATOR' | 'BRAND' | 'ADMIN')[];

  @ApiPropertyOptional({
    enum: ['CREATOR', 'BRAND', 'ADMIN'],
    nullable: true,
    description: 'Default workspace role preference (cross-session default)',
  })
  primaryRole!: 'CREATOR' | 'BRAND' | 'ADMIN' | null;

  @ApiProperty()
  hasCreatorProfile!: boolean;

  @ApiProperty()
  hasBrandProfile!: boolean;

  @ApiProperty({
    description:
      'Whether admin has permanently removed this user’s brand access',
  })
  brandAccessRevoked!: boolean;
}
