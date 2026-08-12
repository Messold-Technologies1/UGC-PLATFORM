import { BadRequestException } from '@nestjs/common';
import { CreatorPackageService } from './creator-package.service';

describe('CreatorPackageService', () => {
  const service = new CreatorPackageService();

  const createMock = jest.fn();

  beforeEach(() => {
    createMock.mockReset();
  });

  it('creates a package with Standard defaults', async () => {
    await service.createPackages({ creatorPackage: { create: createMock } } as any, 'creator-1', [
      {
        priceAmount: '500',
      },
    ]);

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        creatorId: 'creator-1',
        name: 'Standard',
        videoLengthSeconds: 60,
        deliveryDays: 5,
        maxRevisions: 2,
        deliverables: ['1 Video', 'Basic editing', 'Raw footage', '1080p minimum'],
      }),
    });
  });

  it('rejects video length above 60 seconds', async () => {
    await expect(
      service.createPackages({ creatorPackage: { create: createMock } } as any, 'creator-1', [
        {
          priceAmount: '500',
          videoLengthSeconds: 61,
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts dynamic delivery days within range', async () => {
    await service.createPackages({ creatorPackage: { create: createMock } } as any, 'creator-1', [
      {
        priceAmount: '1000',
        deliveryDays: 7,
        maxRevisions: 3,
        name: 'Standard',
        videoLengthSeconds: 45,
      },
    ]);

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deliveryDays: 7,
        maxRevisions: 3,
        videoLengthSeconds: 45,
      }),
    });
  });

  it('rejects delivery days outside allowed range', async () => {
    await expect(
      service.createPackages({ creatorPackage: { create: createMock } } as any, 'creator-1', [
        {
          priceAmount: '500',
          deliveryDays: 31,
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
