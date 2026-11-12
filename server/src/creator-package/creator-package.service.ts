import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CreatorPackageCreateDto } from '../creator-profile/dto/create-creator-profile.dto';
import { FxService } from '../fx/fx.service';

/** Client passed to interactive `$transaction` callbacks */
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class CreatorPackageService {
  private readonly DEFAULT_PACKAGE_NAME = 'Standard';
  private readonly DEFAULT_VIDEO_LENGTH_SECONDS = 60;
  private readonly DEFAULT_DELIVERY_DAYS = 5;
  private readonly DEFAULT_MAX_REVISIONS = 2;
  private readonly MIN_DELIVERY_DAYS = 1;
  private readonly MAX_DELIVERY_DAYS = 30;
  private readonly PRICE_STEP = 500;

  constructor(private readonly fx: FxService) {}

  /**
   * Rupees for a package, whatever currency the creator typed in.
   *
   * The rate is applied here rather than trusted from the request: a
   * client-supplied rupee figure alongside a foreign amount would let a
   * creator name their own exchange rate.
   *
   * A converted amount almost never lands on the PRICE_STEP grid, so it is
   * rounded to the nearest step. The pricing form mirrors this, so the figure
   * a creator is shown before saving is the one that gets stored.
   */
  private async resolvePrice(pkg: CreatorPackageCreateDto): Promise<{
    priceAmount: number;
    priceCurrency: string;
    priceAmountOriginal: Prisma.Decimal | null;
  }> {
    const currency = (pkg.priceCurrency ?? 'INR').trim().toUpperCase() || 'INR';

    if (currency === 'INR') {
      return {
        priceAmount: Number(pkg.priceAmount),
        priceCurrency: 'INR',
        priceAmountOriginal: null,
      };
    }

    const entered = Number(pkg.priceAmountOriginal);
    if (!Number.isFinite(entered) || entered <= 0) {
      throw new BadRequestException(
        'priceAmountOriginal is required when priceCurrency is not INR.',
      );
    }

    const converted = await this.fx.convertToInr(entered, currency);
    if (!converted) {
      // Either the upstream is unreachable or it does not carry this
      // currency (it covers the ECB set, so PKR and the Gulf are out).
      throw new BadRequestException(
        `We cannot convert ${currency} to rupees right now. ` +
          'Enter your price in ₹ instead.',
      );
    }

    // Deliberately NOT snapped to PRICE_STEP. That step is a convention for
    // prices a creator actually chose in rupees; here the rupee figure is
    // derived, and checkout re-converts from `priceAmountOriginal` without
    // snapping. Rounding only this one would make browse and the amount
    // charged differ by an arbitrary few hundred rupees on top of whatever
    // the rate has done since.
    return {
      priceAmount: Number(converted.inr.toFixed(2)),
      priceCurrency: currency,
      priceAmountOriginal: new Prisma.Decimal(entered.toFixed(2)),
    };
  }

  async createPackages(
    tx: PrismaTransactionClient,
    creatorId: string,
    packages: CreatorPackageCreateDto[],
  ) {
    if (packages.length === 0) return;
    if (packages.length > 1) {
      throw new BadRequestException('Only one package is allowed for now.');
    }

    const pkg = packages[0];
    if (!pkg) return;

    const { priceAmount: price, priceCurrency, priceAmountOriginal } =
      await this.resolvePrice(pkg);
    // The whole-number and ?500-step rules describe a price a creator CHOSE,
    // so they only apply when the creator chose rupees. For a foreign-currency
    // package `price` is a derived conversion -- a figure nobody typed, which
    // will rarely be a whole number and almost never a multiple of 500 -- and
    // the creator's own amount is what gets validated instead, in resolvePrice.
    if (priceCurrency === 'INR') {
      if (!Number.isFinite(price) || !Number.isInteger(price)) {
        throw new BadRequestException('priceAmount must be a whole number.');
      }
      if (price < this.PRICE_STEP || price % this.PRICE_STEP !== 0) {
        throw new BadRequestException(
          `priceAmount must be >= ${this.PRICE_STEP} and in steps of ${this.PRICE_STEP}.`,
        );
      }
    } else if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('Converted price is not a valid amount.');
    }

    const videoLengthSeconds =
      pkg.videoLengthSeconds ?? this.DEFAULT_VIDEO_LENGTH_SECONDS;
    if (!Number.isInteger(videoLengthSeconds) || videoLengthSeconds < 1) {
      throw new BadRequestException(
        'videoLengthSeconds must be a positive integer.',
      );
    }

    const deliveryDays = pkg.deliveryDays ?? this.DEFAULT_DELIVERY_DAYS;
    if (!Number.isInteger(deliveryDays)) {
      throw new BadRequestException('deliveryDays must be a whole number.');
    }
    if (
      deliveryDays < this.MIN_DELIVERY_DAYS ||
      deliveryDays > this.MAX_DELIVERY_DAYS
    ) {
      throw new BadRequestException(
        `deliveryDays must be between ${this.MIN_DELIVERY_DAYS} and ${this.MAX_DELIVERY_DAYS}.`,
      );
    }

    const maxRevisions = pkg.maxRevisions ?? this.DEFAULT_MAX_REVISIONS;
    if (!Number.isInteger(maxRevisions) || maxRevisions < 1) {
      throw new BadRequestException('maxRevisions must be >= 1.');
    }

    const packageName = pkg.name?.trim() || this.DEFAULT_PACKAGE_NAME;

    const deliverables = pkg.deliverables?.filter(Boolean).map(String) ?? [];
    const normalizedDeliverables = deliverables.length
      ? deliverables
      : ['1 Video'];
    // Every package includes basic editing and the raw clips for the same order.
    if (!normalizedDeliverables.includes('Basic editing')) {
      normalizedDeliverables.push('Basic editing');
    }
    if (!normalizedDeliverables.includes('Raw footage')) {
      normalizedDeliverables.push('Raw footage');
    }
    if (!normalizedDeliverables.includes('1080p minimum')) {
      normalizedDeliverables.push('1080p minimum');
    }
    if (!normalizedDeliverables.includes('Usage rights: 30 days')) {
      normalizedDeliverables.push('Usage rights: 30 days');
    }

    await tx.creatorPackage.create({
      data: {
        creatorId,
        name: packageName,
        deliverables: normalizedDeliverables,
        videoLengthSeconds,
        priceAmount: new Prisma.Decimal(String(price)),
        priceCurrency,
        priceAmountOriginal,
        deliveryDays,
        maxRevisions,
      },
    });
  }
}
