import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/** Which table the caller's preferences live on. */
export type NotificationProfileType = 'creator' | 'brand' | 'agency';

export class NotificationPreferencesDto {
  @ApiProperty({
    enum: ['creator', 'brand', 'agency'],
    description:
      'The workspace these preferences belong to. One account has exactly one.',
  })
  profileType!: NotificationProfileType;

  @ApiProperty({ example: true })
  emailNotificationsEnabled!: boolean;

  @ApiProperty({ example: true })
  whatsappNotificationsEnabled!: boolean;
}

/**
 * Both fields optional so one toggle can be saved without echoing the other
 * back — two toggles flipped in quick succession would otherwise race, and the
 * slower request would undo the faster one.
 */
export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  whatsappNotificationsEnabled?: boolean;
}
