import { NotFoundException } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';

type Row = {
  id: string;
  emailNotificationsEnabled: boolean;
  whatsappNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
} | null;

function build(rows: {
  creatorProfile?: Row;
  agency?: Row;
  brandProfile?: Row;
}) {
  const table = (row: Row) => ({
    findUnique: jest.fn().mockResolvedValue(row ?? null),
    update: jest.fn(({ data }: { data: Record<string, boolean> }) =>
      Promise.resolve({
        emailNotificationsEnabled:
          data.emailNotificationsEnabled ??
          row?.emailNotificationsEnabled ??
          false,
        whatsappNotificationsEnabled:
          data.whatsappNotificationsEnabled ??
          row?.whatsappNotificationsEnabled ??
          false,
        pushNotificationsEnabled:
          data.pushNotificationsEnabled ??
          row?.pushNotificationsEnabled ??
          false,
      }),
    ),
  });

  const prisma = {
    creatorProfile: table(rows.creatorProfile ?? null),
    agency: table(rows.agency ?? null),
    brandProfile: table(rows.brandProfile ?? null),
  };
  return {
    service: new NotificationPreferencesService(prisma as never),
    prisma,
  };
}

const row = {
  id: 'p1',
  emailNotificationsEnabled: true,
  whatsappNotificationsEnabled: true,
  pushNotificationsEnabled: true,
};

describe('NotificationPreferencesService', () => {
  describe('locating the caller workspace', () => {
    it('reads a creator profile', async () => {
      const { service } = build({ creatorProfile: row });
      await expect(service.getForUser('u1')).resolves.toEqual({
        profileType: 'creator',
        emailNotificationsEnabled: true,
        whatsappNotificationsEnabled: true,
        pushNotificationsEnabled: true,
      });
    });

    it('reads an agency by its owner', async () => {
      const { service, prisma } = build({ agency: row });

      await expect(service.getForUser('u1')).resolves.toMatchObject({
        profileType: 'agency',
      });
      expect(prisma.agency.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerUserId: 'u1' } }),
      );
    });

    it('reads a standalone brand profile', async () => {
      const { service } = build({ brandProfile: row });
      await expect(service.getForUser('u1')).resolves.toMatchObject({
        profileType: 'brand',
      });
    });

    it('throws when the account has no workspace profile', async () => {
      const { service } = build({});
      await expect(service.getForUser('u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updating', () => {
    it('writes only the toggle that was sent', async () => {
      const { service, prisma } = build({ agency: row });

      await service.updateForUser('u1', { emailNotificationsEnabled: false });

      expect(prisma.agency.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: { emailNotificationsEnabled: false },
        }),
      );
    });

    it('leaves the other channel untouched when one is flipped', async () => {
      // Two toggles saved in quick succession would otherwise race, and the
      // slower response would roll the faster one back.
      const { service } = build({ creatorProfile: row });

      await expect(
        service.updateForUser('u1', { whatsappNotificationsEnabled: false }),
      ).resolves.toEqual({
        profileType: 'creator',
        emailNotificationsEnabled: true,
        whatsappNotificationsEnabled: false,
        pushNotificationsEnabled: true,
      });
    });

    // The browser permission is the real opt-in; this column only mutes it.
    // Muting push must not disturb the two channels beside it.
    it('mutes push without touching the other channels', async () => {
      const { service, prisma } = build({ creatorProfile: row });

      await expect(
        service.updateForUser('u1', { pushNotificationsEnabled: false }),
      ).resolves.toEqual({
        profileType: 'creator',
        emailNotificationsEnabled: true,
        whatsappNotificationsEnabled: true,
        pushNotificationsEnabled: false,
      });
      expect(prisma.creatorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { pushNotificationsEnabled: false } }),
      );
    });

    it('writes to the table the caller actually owns', async () => {
      const { service, prisma } = build({ brandProfile: row });

      await service.updateForUser('u1', { emailNotificationsEnabled: false });

      expect(prisma.brandProfile.update).toHaveBeenCalled();
      expect(prisma.creatorProfile.update).not.toHaveBeenCalled();
      expect(prisma.agency.update).not.toHaveBeenCalled();
    });

    it('is a no-op read when the body carries no toggles', async () => {
      const { service, prisma } = build({ agency: row });

      await expect(service.updateForUser('u1', {})).resolves.toMatchObject({
        profileType: 'agency',
      });
      expect(prisma.agency.update).not.toHaveBeenCalled();
    });

    it('refuses to update an account with no workspace profile', async () => {
      const { service } = build({});
      await expect(
        service.updateForUser('u1', { emailNotificationsEnabled: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
