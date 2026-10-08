import { ConflictException, NotFoundException } from '@nestjs/common';
import { AgencyService } from './agency.service';

/**
 * Agency creation at signup.
 *
 * The notification columns default to false at the database level, matching the
 * brand and creator columns — so an agency that is created without them set is
 * silently opted out of every order email and WhatsApp, with no settings screen
 * to turn them back on. Nothing else would fail, which is why this is asserted
 * here rather than left to the gate tests.
 */

const input = {
  name: 'Northstar Media',
  contactFullName: 'Jane Doe',
  contactEmail: 'Hello@Northstar.Example',
  contactPhone: '+919812345678',
  contactPhoneVerified: true,
  website: 'https://northstar.example',
};

function build(opts: { existingAgency?: boolean; role?: boolean } = {}) {
  const create = jest.fn().mockResolvedValue({
    id: 'agency-1',
    ownerUserId: 'user-1',
    name: input.name,
    logoKey: null,
    logoUrl: null,
    website: input.website,
    contactFullName: input.contactFullName,
    contactEmail: 'hello@northstar.example',
    contactPhone: input.contactPhone,
    contactPhoneVerified: true,
    brandNames: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const tx = {
    agency: {
      findUnique: jest
        .fn()
        .mockResolvedValue(opts.existingAgency ? { id: 'agency-0' } : null),
      create,
    },
    role: {
      findUnique: jest
        .fn()
        .mockResolvedValue(opts.role === false ? null : { id: 'role-agency' }),
    },
    userRole: { upsert: jest.fn().mockResolvedValue({}) },
    user: { update: jest.fn().mockResolvedValue({}) },
  };

  const service = new AgencyService({} as never, {} as never);
  return { service, tx, create };
}

describe('AgencyService.runCreateAgencyInTransaction', () => {
  it('opts a new agency in to email and WhatsApp', async () => {
    const { service, tx, create } = build();

    await service.runCreateAgencyInTransaction(tx, 'user-1', input);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailNotificationsEnabled: true,
          whatsappNotificationsEnabled: true,
        }) as unknown,
      }),
    );
  });

  it('refuses a second agency for the same owner', async () => {
    const { service, tx } = build({ existingAgency: true });

    await expect(
      service.runCreateAgencyInTransaction(tx, 'user-1', input),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses when the AGENCY role is missing', async () => {
    const { service, tx } = build({ role: false });

    await expect(
      service.runCreateAgencyInTransaction(tx, 'user-1', input),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
