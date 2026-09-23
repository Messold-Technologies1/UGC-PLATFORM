import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class BrandUserStatusDto {
  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.DEACTIVATED,
    description:
      'Account status after the change. Anything other than ACTIVE blocks login, /me and every workspace guard.',
  })
  status!: UserStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: 'When this status was set.',
  })
  statusChangedAt!: Date | null;
}
