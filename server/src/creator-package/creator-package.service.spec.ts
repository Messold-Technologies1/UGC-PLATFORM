import { BadRequestException } from '@nestjs/common';
import { CreatorPackageService } from './creator-package.service';
import type { FxService } from '../fx/fx.service';

describe('CreatorPackageService', () => {
  // These cases are all rupee prices, which never reach the converter.
  const fx = {
    convertToInr: jest.fn(),
  } as unknown as FxService;
  const service = new CreatorPackageService(fx);

  const createMock = jest.fn();

  beforeEach(() => {
    createMock.mockReset();
    (fx.convertToInr as jest.Mock).mockReset();
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
        deliverables: [
          '1 Video',
          'Basic editing',
          'Raw footage',
          '1080p minimum',
          'Usage rights: 30 days',
        ],
      }),
    });
  });

  it('accepts video length above 60 seconds (no upper limit)', async () => {
    await service.createPackages({ creatorPackage: { create: createMock } } as any, 'creator-1', [
      {
        priceAmount: '500',
        videoLengthSeconds: 120,
      },
    ]);

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ videoLengthSeconds: 120 }),
    });
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

  describe('pricing in a creator\'s own currency', () => {
    const tx = () => ({ creatorPackage: { create: createMock } }) as never;

    it('converts to rupees and keeps what was typed', async () => {
      (fx.convertToInr as jest.Mock).mockResolvedValue({
        inr: 9345.79,
        rate: 93.4579,
        date: '2026-11-11',
      });

      await service.createPackages(tx(), 'creator-1', [
        { priceAmount: '0', priceCurrency: 'USD', priceAmountOriginal: '100' },
      ]);

      expect(fx.convertToInr).toHaveBeenCalledWith(100, 'USD');
      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          // 9345.79 snapped to the nearest 500.
          priceAmount: expect.objectContaining({ s: 1 }),
          priceCurrency: 'USD',
        }),
      });
      const data = createMock.mock.calls[0][0].data;
      expect(Number(data.priceAmount)).toBe(9500);
      expect(Number(data.priceAmountOriginal)).toBe(100);
    });

    it('ignores any rupee figure the client sent alongside', async () => {
      // Otherwise a creator could name their own exchange rate.
      (fx.convertToInr as jest.Mock).mockResolvedValue({
        inr: 9345.79,
        rate: 93.4579,
        date: '',
      });

      await service.createPackages(tx(), 'creator-1', [
        {
          priceAmount: '999999',
          priceCurrency: 'USD',
          priceAmountOriginal: '100',
        },
      ]);

      expect(Number(createMock.mock.calls[0][0].data.priceAmount)).toBe(9500);
    });

    it('refuses a currency it cannot convert, naming it', async () => {
      // Frankfurter carries the ECB set only, so PKR and the Gulf are out —
      // and this product has creators in Pakistan.
      (fx.convertToInr as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createPackages(tx(), 'creator-1', [
          { priceAmount: '0', priceCurrency: 'PKR', priceAmountOriginal: '5000' },
        ]),
      ).rejects.toThrow(/PKR/);
      expect(createMock).not.toHaveBeenCalled();
    });

    it('requires the typed amount when a currency is given', async () => {
      await expect(
        service.createPackages(tx(), 'creator-1', [
          { priceAmount: '500', priceCurrency: 'USD' },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('leaves a rupee price alone and never calls the converter', async () => {
      await service.createPackages(tx(), 'creator-1', [
        { priceAmount: '5000', priceCurrency: 'INR' },
      ]);

      expect(fx.convertToInr).not.toHaveBeenCalled();
      const data = createMock.mock.calls[0][0].data;
      expect(Number(data.priceAmount)).toBe(5000);
      expect(data.priceCurrency).toBe('INR');
      expect(data.priceAmountOriginal).toBeNull();
    });
  });
});
