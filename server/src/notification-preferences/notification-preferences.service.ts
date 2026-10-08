import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  NotificationPreferencesDto,
  NotificationProfileType,
  UpdateNotificationPreferencesDto,
} from './dto/notification-preferences.dto';

/**
 * Read and write the two per-profile opt-in booleans the send gates consult.
 *
 * One endpoint for all three workspaces rather than a field bolted onto each
 * profile's update route: the columns are identical, the settings card is
 * identical, and the send gates already treat the three the same way. The only
 * thing that differs is which table the row is on.
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string): Promise<NotificationPreferencesDto> {
    const target = await this.locate(userId);
    return {
      profileType: target.profileType,
      emailNotificationsEnabled: target.emailNotificationsEnabled,
      whatsappNotificationsEnabled: target.whatsappNotificationsEnabled,
    };
  }

  async updateForUser(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    const target = await this.locate(userId);

    // Only the keys actually sent are written, so saving one toggle cannot
    // clobber the other with a stale value from the client.
    const data: Record<string, boolean> = {};
    if (dto.emailNotificationsEnabled !== undefined) {
      data.emailNotificationsEnabled = dto.emailNotificationsEnabled;
    }
    if (dto.whatsappNotificationsEnabled !== undefined) {
      data.whatsappNotificationsEnabled = dto.whatsappNotificationsEnabled;
    }
    if (Object.keys(data).length === 0) {
      return this.getForUser(userId);
    }

    const select = {
      emailNotificationsEnabled: true,
      whatsappNotificationsEnabled: true,
    } as const;
    const where = { id: target.id };

    const updated =
      target.profileType === 'creator'
        ? await this.prisma.creatorProfile.update({ where, data, select })
        : target.profileType === 'agency'
          ? await this.prisma.agency.update({ where, data, select })
          : await this.prisma.brandProfile.update({ where, data, select });

    return { profileType: target.profileType, ...updated };
  }

  /**
   * One email = one workspace role, so at most one of these exists. Checked in
   * a fixed order anyway, so a row left behind by a role change can never make
   * the answer depend on which query happened to run first.
   */
  private async locate(userId: string): Promise<{
    profileType: NotificationProfileType;
    id: string;
    emailNotificationsEnabled: boolean;
    whatsappNotificationsEnabled: boolean;
  }> {
    const select = {
      id: true,
      emailNotificationsEnabled: true,
      whatsappNotificationsEnabled: true,
    } as const;

    const creator = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select,
    });
    if (creator) return { profileType: 'creator', ...creator };

    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId: userId },
      select,
    });
    if (agency) return { profileType: 'agency', ...agency };

    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId },
      select,
    });
    if (brand) return { profileType: 'brand', ...brand };

    throw new NotFoundException(
      'No creator, brand or agency profile for this account',
    );
  }
}
