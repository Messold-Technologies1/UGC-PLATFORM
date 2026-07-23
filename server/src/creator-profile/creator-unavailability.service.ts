import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreatorUnavailabilityDto,
  UpsertCreatorUnavailabilityDto,
} from './dto/creator-unavailability.dto';
import {
  formatDateOnly,
  isDateWithinInclusiveRange,
  parseDateOnly,
  todayDateOnlyUtc,
} from './creator-unavailability.util';

@Injectable()
export class CreatorUnavailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getForCurrentCreator(
    userId: string,
  ): Promise<CreatorUnavailabilityDto | null> {
    const profile = await this.requireCreatorProfile(userId);
    const row = await this.prisma.creatorUnavailability.findUnique({
      where: { creatorId: profile.id },
    });
    return row ? this.mapRow(row) : null;
  }

  async upsertForCurrentCreator(
    userId: string,
    dto: UpsertCreatorUnavailabilityDto,
  ): Promise<CreatorUnavailabilityDto> {
    const profile = await this.requireCreatorProfile(userId);
    const startsOn = parseDateOnly(dto.startsOn);
    const endsOn = parseDateOnly(dto.endsOn);

    if (!startsOn || !endsOn) {
      throw new BadRequestException('startsOn and endsOn must be valid dates');
    }
    if (endsOn.getTime() < startsOn.getTime()) {
      throw new BadRequestException('endsOn must be on or after startsOn');
    }

    const row = await this.prisma.creatorUnavailability.upsert({
      where: { creatorId: profile.id },
      create: {
        creatorId: profile.id,
        startsOn,
        endsOn,
      },
      update: {
        startsOn,
        endsOn,
      },
    });

    return this.mapRow(row);
  }

  async clearForCurrentCreator(userId: string): Promise<void> {
    const profile = await this.requireCreatorProfile(userId);
    await this.prisma.creatorUnavailability.deleteMany({
      where: { creatorId: profile.id },
    });
  }

  private async requireCreatorProfile(userId: string): Promise<{ id: string }> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }
    return profile;
  }

  private mapRow(row: {
    id: string;
    startsOn: Date;
    endsOn: Date;
  }): CreatorUnavailabilityDto {
    const today = todayDateOnlyUtc();
    return {
      id: row.id,
      startsOn: formatDateOnly(row.startsOn),
      endsOn: formatDateOnly(row.endsOn),
      isCurrentlyUnavailable: isDateWithinInclusiveRange(
        today,
        row.startsOn,
        row.endsOn,
      ),
    };
  }
}
